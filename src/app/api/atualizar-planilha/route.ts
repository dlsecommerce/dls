import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import he from "he";

export const runtime = "nodejs"; // ✅ precisa ser node (exceljs + buffers)
export const dynamic = "force-dynamic"; // ✅ evita cache em deploys

/** 🔤 Decodifica HTML e limpa sujeiras */
function limparTexto(valor: unknown) {
  const texto = he
    .decode(String(valor ?? "").trim())
    .replace(/^&[a-z]+;$/i, "")
    .trim();

  if (
    !texto ||
    /^[^a-zA-Z0-9>]+$/.test(texto) ||
    ["undefined", "null"].includes(texto.toLowerCase())
  ) {
    return "";
  }
  return texto;
}

/** Normaliza string (para comparar headers) */
function normalize(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Lê CSV ";" em buffer e vira array de objetos
 * ✅ Também salva colunas por índice em "__cols" pra pegar BF (58)
 */
function lerCSVBuffer(buf: Buffer) {
  const texto = buf.toString("utf8").replace(/^\uFEFF/, "");
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhas.length < 2) return [];

  const headers = linhas[0]
    .split(";")
    .map((h) => h.replace(/(^"|"$)/g, "").trim());

  return linhas.slice(1).map((linha) => {
    const valores = linha
      .split(";")
      .map((v) => v.replace(/(^"|"$)/g, "").trim());

    const obj: any = {};
    headers.forEach((h, i) => (obj[h] = valores[i] ?? ""));
    obj.__cols = valores; // BF => __cols[57]
    return obj;
  });
}

/** pick tolerante */
function pick(obj: any, keyCandidates: string[] = []) {
  const map = new Map(Object.keys(obj || {}).map((k) => [normalize(k), obj[k]]));
  const allKeys = Array.from(map.keys());

  for (const cand of keyCandidates) {
    const normCand = normalize(cand);
    const v = map.get(normCand);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }

  for (const cand of keyCandidates) {
    const normCand = normalize(cand);
    const keyEncontrada = allKeys.find(
      (k) => k.includes(normCand) || normCand.includes(k)
    );
    if (keyEncontrada) {
      const v = map.get(keyEncontrada);
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }

  return "";
}

/** encontra produto no bling (por id / código / nome) */
function encontrarProdutoNoBling(
  bling: any[],
  { idProduto, referencia, nomeVinculo }: { idProduto: string; referencia: string; nomeVinculo: string }
) {
  const idProd = String(idProduto || "").trim();
  const ref = String(referencia || "").trim().toLowerCase();
  const nomeNorm = normalize(nomeVinculo);

  let prod =
    bling.find((b) => String(pick(b, ["ID", "Id", "Id Produto", "ID Produto"])).trim() === idProd) ||
    null;
  if (prod) return prod;

  prod =
    bling.find((b) => {
      const codigo = String(pick(b, ["Código", "Codigo", "SKU"]) || "")
        .trim()
        .toLowerCase();
      if (!codigo || !ref) return false;
      return codigo === ref || codigo.includes(ref) || ref.includes(codigo);
    }) || null;
  if (prod) return prod;

  prod =
    bling.find((b) => {
      const nomeB = String(pick(b, ["Descrição", "Descricao", "Nome"]) || "");
      const nomeBNorm = normalize(nomeB);
      return nomeBNorm && nomeNorm && nomeBNorm.includes(nomeNorm);
    }) || null;

  return prod || null;
}

/** ✅ Categoria = Bling coluna BF (58ª) */
function getCategoriaFromBlingBF(blingProd: any) {
  if (!blingProd) return "";
  const cols = blingProd.__cols;
  if (Array.isArray(cols) && cols.length >= 58) {
    const bf = limparTexto(cols[57]);
    if (bf) return bf.replace(/\s*>>\s*/g, " » ").trim();
  }
  // fallback por nome (se BF não existir no CSV)
  const cat = limparTexto(
    pick(blingProd, [
      "Categoria",
      "Categoria Produto",
      "Categoria do produto",
      "Categoria do Produto",
      "CategoriaProduto",
    ])
  );
  return cat ? cat.replace(/\s*>>\s*/g, " » ").trim() : "";
}

/**
 * ✅ Parse referência:
 * - separador de itens: "/"
 * - se tiver tokens por "-" com um número (12/6/3/...) antes do último token => qtd = número; codigo = último token
 * - senão => qtd = 1; codigo = item inteiro
 */
function parseReferencia(refRaw: string) {
  const ref = String(refRaw || "").trim();
  if (!ref) return [];

  const limpo = ref.replace(/^\s*(PAI|VAR)\s*-\s*/i, "").trim();

  const items = limpo
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: Array<{ codigo: string; qtd: number }> = [];

  for (const item of items) {
    const parts = item
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      let qtd = 1;

      for (let i = 0; i < parts.length - 1; i++) {
        if (/^\d+$/.test(parts[i])) {
          qtd = parseInt(parts[i], 10);
          break;
        }
      }

      if (qtd >= 2 && last) {
        out.push({ codigo: last, qtd });
        continue;
      }
    }

    out.push({ codigo: item, qtd: 1 });
  }

  return out;
}

/** build map de headers do modelo (linha 2) */
function buildHeaderMap(sheet: ExcelJS.Worksheet, headerRow = 2) {
  const map = new Map<string, number>();
  const row = sheet.getRow(headerRow);
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = String(cell.value ?? "").trim();
    if (!key) return;
    map.set(normalize(key), col);
  });
  return map;
}

/** pega coluna pelo nome */
function colOf(headerMap: Map<string, number>, name: string) {
  return headerMap.get(normalize(name));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const loja = String(formData.get("loja") || "").trim();

    const modeloFile = formData.get("modelo") as File | null;
    const blingFile = formData.get("bling") as File | null;
    const vinculoFile = formData.get("vinculo") as File | null;
    // tray pode existir ou não (não é necessário pra essas regras específicas)
    // const trayFile = formData.get("tray") as File | null;

    if (!modeloFile || !blingFile || !vinculoFile) {
      return NextResponse.json(
        { error: "⚠️ Envie Modelo, Bling e Vínculo." },
        { status: 400 }
      );
    }

    const modeloBuf = Buffer.from(await modeloFile.arrayBuffer());
    const blingBuf = Buffer.from(await blingFile.arrayBuffer());
    const vinculoBuf = Buffer.from(await vinculoFile.arrayBuffer());

    const bling = lerCSVBuffer(blingBuf);
    const vinculo = lerCSVBuffer(vinculoBuf);

    // carrega modelo excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(modeloBuf);
    const sheet = workbook.worksheets[0];

    // headers na linha 2
    const headerMap = buildHeaderMap(sheet, 2);

    // ✅ colunas alvo
    const colIdTray = colOf(headerMap, "ID TRAY") ?? colOf(headerMap, "ID Tray");
    const colIdVar = colOf(headerMap, "ID VAR") ?? colOf(headerMap, "ID Var");
    const colReferencia =
      colOf(headerMap, "Referência") ??
      colOf(headerMap, "Referencia") ??
      colOf(headerMap, "REFERÊNCIA");

    if (!colIdTray) throw new Error("Coluna 'ID TRAY' não encontrada no MODELO.");
    if (!colIdVar) throw new Error("Coluna 'ID VAR' não encontrada no MODELO.");
    if (!colReferencia) throw new Error("Coluna 'Referência' não encontrada no MODELO.");

    // ✅ Categoria é coluna J (10)
    const colCategoriaModelo = 10;

    // ✅ Código/Quant (1..10)
    const codigoCols: number[] = [];
    const quantCols: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const c = colOf(headerMap, `Código ${i}`) ?? colOf(headerMap, `Codigo ${i}`);
      const q = colOf(headerMap, `Quant. ${i}`) ?? colOf(headerMap, `Quant ${i}`);
      if (!c || !q) {
        throw new Error(`Colunas 'Código ${i}' e/ou 'Quant. ${i}' não encontradas no MODELO.`);
      }
      codigoCols.push(c);
      quantCols.push(q);
    }

    // limpa linhas 3+
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 3) row.eachCell((cell) => (cell.value = null));
    });

    let linhaAtual = 3;

    for (const v of vinculo) {
      const idProduto = String(v["IdProduto"] || "").trim();
      const nomeVinculo = limparTexto(String(v["Nome"] || "").trim());
      const referencia = String(v["Código"] || "").trim();

      // linha válida se tiver algo
      if (!idProduto && !nomeVinculo && !referencia) continue;

      const blProduto = encontrarProdutoNoBling(bling, {
        idProduto,
        referencia,
        nomeVinculo,
      });

      const categoria = getCategoriaFromBlingBF(blProduto);

      const row = sheet.getRow(linhaAtual);

      // preenche campos que já existem no modelo se você quiser (opcional)
      // Aqui mantive apenas as regras que você pediu
      row.getCell(colCategoriaModelo).value = categoria || "";

      // ✅ regra 1: ID TRAY e ID VAR = "N TRAY"
      row.getCell(colIdTray).value = "N TRAY";
      row.getCell(colIdVar).value = "N TRAY";

      // ✅ regra 3: parse referência -> Código/Quant
      const parsed = parseReferencia(referencia);

      for (let i = 0; i < 10; i++) {
        row.getCell(codigoCols[i]).value = null;
        row.getCell(quantCols[i]).value = null;
      }

      for (let i = 0; i < Math.min(parsed.length, 10); i++) {
        row.getCell(codigoCols[i]).value = parsed[i].codigo;
        row.getCell(quantCols[i]).value = parsed[i].qtd;
      }

      row.commit?.();
      linhaAtual++;
    }

    const out = await workbook.xlsx.writeBuffer();
    const fileName = `AUTOMACAO-${(loja || "MODELO").toUpperCase().replace(/\s+/g, "-")}-${Date.now()}.xlsx`;

    return new NextResponse(Buffer.from(out), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
