import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import chalk from "chalk";
import he from "he"; // ✅ decodificador HTML

const app = express();

/**
 * ✅ CORS (localhost + produção)
 * - Em produção, coloque seu domínio em ALLOWED_ORIGINS (ou via env).
 * - expõe Content-Disposition (ajuda no download)
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // permite tools/postman sem origin
      if (!origin) return cb(null, true);

      const isLocal =
        origin.includes("http://localhost") || origin.includes("http://127.0.0.1");

      // se não configurou env, libera localhost
      if (ALLOWED_ORIGINS.length === 0 && isLocal) return cb(null, true);

      // se configurou env, valida lista + localhost
      if (ALLOWED_ORIGINS.includes(origin) || isLocal) return cb(null, true);

      return cb(new Error("CORS bloqueado para: " + origin));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// ✅ mantém uploads em disco (como você já usa)
const upload = multer({ dest: "uploads/" });

/** 📄 Lê CSV e converte em array de objetos
 * ✅ Também salva as colunas por índice em "__cols" para você conseguir pegar BF (58ª)
 */
function lerCSV(filePath) {
  const texto = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhas.length < 2) return [];

  const headers = linhas[0]
    .split(";")
    .map((h) => h.replace(/(^"|"$)/g, "").trim());

  return linhas.slice(1).map((linha) => {
    const valores = linha
      .split(";")
      .map((v) => v.replace(/(^"|"$)/g, "").trim());

    const obj = {};
    headers.forEach((h, i) => (obj[h] = valores[i] ?? ""));

    // ✅ acesso por índice: BF => __cols[57]
    obj.__cols = valores;

    return obj;
  });
}

/** 🔤 Decodifica HTML e remove sujeiras (&otilde;, &ccedil;, etc.) */
function limparTexto(valor) {
  const texto = he
    .decode(String(valor || "").trim())
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

/** 🧠 Define OD: 1 = PAI, 2 = VAR, 3 = SIMPLES */
function definirOD(ref) {
  if (!ref) return 3;
  const r = String(ref).toUpperCase();
  if (r.includes("PAI -")) return 1;
  if (r.includes("VAR -")) return 2;
  return 3;
}

/** 🔤 Normalização */
function normalize(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function normCode(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** 🔎 pick() aprimorado com tolerância a nomes parciais e variações */
function pick(obj, keyCandidates = []) {
  const map = new Map(Object.keys(obj || {}).map((k) => [normalize(k), obj[k]]));
  const allKeys = Array.from(map.keys());

  // 1) exato
  for (const cand of keyCandidates) {
    const normCand = normalize(cand);
    const v = map.get(normCand);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }

  // 2) parcial
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

  // 3) genérico “categoria”
  if (keyCandidates.some((k) => normalize(k).includes("categoria"))) {
    const chaveCat = allKeys.find((k) => k.includes("categoria"));
    if (chaveCat) {
      const v = map.get(chaveCat);
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }

  return "";
}

/** 🏷️ Remove prefixos PAI/VAR do nome */
function baseNomeGrupo(nome = "") {
  let s = String(nome || "");
  s = s.replace(/^\s*PAI\s*-\s*/i, "");
  s = s.replace(/^\s*VAR\s*-\s*/i, "");
  return s.trim();
}

/** 🎨 Aplica estilos de cabeçalho e cores */
function aplicarEstiloCabecalho(sheet) {
  const azulEscuro = "004A9F";
  const azulClaro = "2699FE";
  const branco = "FFFFFFFF";

  const grupos = [
    { range: "A1:F1", texto: "IDENTIFICAÇÃO" },
    { range: "G1:M1", texto: "DESCRIÇÃO" },
    { range: "N1:AE1", texto: "COMPOSIÇÃO DE CUSTOS" },
  ];

  for (const { range, texto } of grupos) {
    try {
      sheet.unMergeCells(range);
    } catch {}
    sheet.mergeCells(range);
    const c = sheet.getCell(range.split(":")[0]);
    c.value = texto;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.font = { bold: true, color: { argb: branco }, size: 12 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: azulEscuro } };
  }

  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: azulEscuro } };
    cell.font = { color: { argb: branco }, bold: true, size: 12 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  sheet.getRow(2).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: azulClaro } };
    cell.font = { color: { argb: branco }, bold: true, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
}

/** 🔎 Estratégia robusta para encontrar o produto no Bling */
function encontrarProdutoNoBling(bling, { idProduto, referencia, nomeVinculo }) {
  const refNorm = normCode(referencia);
  const nomeNormVinc = normalize(nomeVinculo);

  let prod =
    bling.find(
      (b) =>
        String(pick(b, ["ID", "Id", "Id Produto", "ID Produto"])).trim() ===
        String(idProduto).trim()
    ) || null;
  if (prod) return prod;

  prod =
    bling.find((b) => {
      const codigo = pick(b, ["Código", "Codigo", "SKU"]) || "";
      const codNorm = normCode(codigo);
      return (
        (refNorm &&
          codNorm &&
          (refNorm === codNorm || refNorm === codNorm.replace(/^0+/, ""))) ||
        (refNorm && codNorm.includes(refNorm)) ||
        (refNorm && refNorm.includes(codNorm))
      );
    }) || null;
  if (prod) return prod;

  prod =
    bling.find((b) => {
      const nomeBling = pick(b, ["Descrição", "Descricao", "Nome"]) || "";
      const nomeNormBling = normalize(nomeBling);
      return nomeNormBling && nomeNormVinc && nomeNormBling.includes(nomeNormVinc);
    }) || null;

  return prod || null;
}

/**
 * ✅ REGRA: Categoria do MODELO (coluna J) = BLING coluna BF (58ª)
 * BF -> 58 (1-based) => __cols[57] (0-based)
 */
function getCategoriaFromBlingBF(blingProd) {
  if (!blingProd) return "";
  const cols = blingProd.__cols;
  if (Array.isArray(cols) && cols.length >= 58) {
    const bf = limparTexto(cols[57]);
    if (bf) return bf.replace(/\s*>>\s*/g, " » ").trim();
  }

  // fallback por nome (caso BF não exista no CSV)
  let categoria =
    limparTexto(
      pick(blingProd, [
        "Categoria",
        "Categoria Produto",
        "Categoria do produto",
        "Categoria do Produto",
        "CategoriaProduto",
      ])
    ) || "";
  categoria = categoria.replace(/\s*>>\s*/g, " » ").trim();
  return categoria;
}

/**
 * ✅ PARSE DA REFERÊNCIA PARA CÓDIGO/QUANTIDADE
 * - separador de itens: "/"
 * - para cada item:
 *    - se tiver "-" com número (12/6/3/...) em algum token e um último token => qtd = número, codigo = último token
 *    - senão => qtd = 1, codigo = item inteiro
 *
 * Ex:
 *  "PAI - liv-12-11766" -> [{codigo:"11766", qtd:12}]
 *  "VAR - liv-12-11766" -> [{codigo:"11766", qtd:12}]
 *  "all black/gaita"    -> [{codigo:"all black", qtd:1}, {codigo:"gaita", qtd:1}]
 */
function parseReferencia(refRaw) {
  const ref = String(refRaw || "").trim();
  if (!ref) return [];

  // remove prefixos "PAI -" e "VAR -"
  const limpo = ref.replace(/^\s*(PAI|VAR)\s*-\s*/i, "").trim();

  const items = limpo
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];

  for (const item of items) {
    const parts = item
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      let qtd = 1;

      // procura um token numérico (12 / 6 / 3 etc.) antes do last
      for (let i = 0; i < parts.length - 1; i++) {
        if (/^\d+$/.test(parts[i])) {
          qtd = parseInt(parts[i], 10);
          break;
        }
      }

      // se achou qtd e last existe, usa last como código
      if (qtd >= 2 && last) {
        out.push({ codigo: last, qtd });
        continue;
      }
    }

    // fallback: item é o próprio código, qtd 1
    out.push({ codigo: item, qtd: 1 });
  }

  return out;
}

/** acha coluna pelo nome no headerMap (normalizado) */
function findCol(headerMap, name) {
  const n = normalize(name);
  const h = headerMap.find((x) => x.norm === n);
  return h?.col ?? null;
}

/** 🚀 Endpoint principal */
app.post(
  "/atualizar-planilha",
  upload.fields([
    { name: "modelo" },
    { name: "bling" },
    { name: "tray" }, // pode ser opcional dependendo da loja
    { name: "vinculo" },
  ]),
  async (req, res) => {
    const filesToCleanup = [];

    try {
      // Loja recebida do FormData
      const lojaRaw = (req.body?.loja || "").toString().trim();

      const modeloPath = req.files?.["modelo"]?.[0]?.path;
      const blingPath = req.files?.["bling"]?.[0]?.path;
      const trayPath = req.files?.["tray"]?.[0]?.path; // pode ser undefined
      const vinculoPath = req.files?.["vinculo"]?.[0]?.path;

      if (modeloPath) filesToCleanup.push(modeloPath);
      if (blingPath) filesToCleanup.push(blingPath);
      if (trayPath) filesToCleanup.push(trayPath);
      if (vinculoPath) filesToCleanup.push(vinculoPath);

      // Obrigatórios sempre
      if (!modeloPath || !blingPath || !vinculoPath) {
        throw new Error("⚠️ Envie Modelo, Bling e Vínculo.");
      }

      const bling = lerCSV(blingPath);
      // tray/vinculo mantidos (mesmo se não usar em alguma regra)
      const tray = trayPath ? lerCSV(trayPath) : [];
      const vinculo = lerCSV(vinculoPath);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(modeloPath);
      const sheet = workbook.worksheets[0];
      aplicarEstiloCabecalho(sheet);

      // monta headerMap pela linha 2
      const headerMap = [];
      sheet.getRow(2).eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber >= 1) {
          const key = String(cell.value || "").trim();
          headerMap.push({ col: colNumber, key, norm: normalize(key) });
        }
      });

      // ✅ Coluna J do modelo (Categoria) = 10
      const colCategoriaModelo = 10;

      // ✅ achar colunas de destino
      const colIdTray = findCol(headerMap, "ID Tray") || findCol(headerMap, "ID TRAY");
      const colIdVar = findCol(headerMap, "ID Var") || findCol(headerMap, "ID VAR");

      if (!colIdTray) throw new Error("Coluna 'ID Tray' não encontrada no MODELO.");
      if (!colIdVar) throw new Error("Coluna 'ID Var' não encontrada no MODELO.");

      const colReferencia = findCol(headerMap, "Referência") || findCol(headerMap, "Referencia");
      if (!colReferencia) throw new Error("Coluna 'Referência' não encontrada no MODELO.");

      const codigoCols = [];
      const quantCols = [];
      for (let i = 1; i <= 10; i++) {
        const c = findCol(headerMap, `Código ${i}`) || findCol(headerMap, `Codigo ${i}`);
        const q = findCol(headerMap, `Quant. ${i}`) || findCol(headerMap, `Quant ${i}`);
        if (!c || !q) {
          throw new Error(
            `Colunas 'Código ${i}' e/ou 'Quant. ${i}' não encontradas no MODELO.`
          );
        }
        codigoCols.push(c);
        quantCols.push(q);
      }

      // limpa conteúdo antigo (mantém estilos)
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) row.eachCell((cell) => (cell.value = null));
      });

      console.log(
        chalk.cyanBright(
          `\n🚀 Iniciando automação... Loja: ${lojaRaw || "NÃO INFORMADA"} | Tray: ${
            trayPath ? "SIM" : "NÃO"
          }\n`
        )
      );

      // lógica original sua (pai/var por grupo) mantida
      const parentTrayByGroup = new Map();
      for (const v of vinculo) {
        const idLoja = v["ID na Loja"]?.trim() || "";
        const nomeVinculo = v["Nome"]?.trim() || "";
        const codigoVinculo = v["Código"]?.trim() || "";
        const idProduto = v["IdProduto"]?.trim() || "";
        const nome = nomeVinculo;
        const referencia = codigoVinculo;
        const od = definirOD(nome) !== 3 ? definirOD(nome) : definirOD(referencia);
        if (od === 1) {
          const group = normalize(baseNomeGrupo(nome));
          if (group) parentTrayByGroup.set(group, idLoja);
        }
      }

      let linhaAtual = 3;
      let processados = 0;

      for (const v of vinculo) {
        const idProduto = (v["IdProduto"] || "").toString().trim();
        const idLojaOriginal = (v["ID na Loja"] || "").toString().trim();
        const nomeVinculo = limparTexto((v["Nome"] || "").toString().trim());
        const referencia = (v["Código"] || "").toString().trim();
        const nome = nomeVinculo;

        const blProduto = encontrarProdutoNoBling(bling, {
          idProduto,
          referencia,
          nomeVinculo,
        });

        // ✅ Categoria = BLING BF
        const categoria = getCategoriaFromBlingBF(blProduto);

        // sua lógica OD (mantida)
        let od = definirOD(nome);
        if (od === 3) od = definirOD(referencia);

        let idTrayCalc = idLojaOriginal;
        const group = normalize(baseNomeGrupo(nome));
        if (od === 2 && group && parentTrayByGroup.has(group)) {
          idTrayCalc = parentTrayByGroup.get(group) || idLojaOriginal;
        }

        // sua lógica var (mantida)
        let idVarCalc;
        if (od === 1) idVarCalc = "PAI";
        else if (od === 2) idVarCalc = idLojaOriginal;
        else idVarCalc = "SIMPLES";

        // monta linha (mantida)
        const novaLinha = {
          ID: "",
          Loja: /\d/.test(idTrayCalc) ? "PK" : idTrayCalc ? "SB" : "NULL",
          "ID Bling": pick(blProduto || {}, ["ID", "Id", "Id Produto", "ID Produto"]),
          "ID Tray": idTrayCalc, // <- vai ser sobrescrito com "N TRAY" abaixo
          Referência: referencia,
          "ID Var": idVarCalc, // <- vai ser sobrescrito com "N TRAY" abaixo
          OD: od,
          Nome: nome,
          Marca: limparTexto(pick(blProduto || {}, ["Marca"])),
          Categoria: categoria,
          Peso: pick(blProduto || {}, ["Peso líquido (Kg)", "Peso Liquido (Kg)", "Peso líquido", "Peso"]),
          Largura: pick(blProduto || {}, ["Largura do produto", "Largura"]),
          Altura: pick(blProduto || {}, ["Altura do Produto", "Altura"]),
          Comprimento: pick(blProduto || {}, ["Profundidade do produto", "Comprimento", "Profundidade"]),
        };

        const row = sheet.getRow(linhaAtual);

        // escreve o que seu headerMap reconhece
        const novaLinhaNormMap = new Map(
          Object.keys(novaLinha).map((k) => [normalize(k), novaLinha[k]])
        );

        for (const { col, key, norm } of headerMap) {
          let valor =
            Object.prototype.hasOwnProperty.call(novaLinha, key) && novaLinha[key] !== undefined
              ? novaLinha[key]
              : undefined;
          if (valor === undefined) valor = novaLinhaNormMap.get(norm);
          row.getCell(col).value = valor !== undefined ? valor : "";
        }

        // ✅ (2) Coluna J (Categoria) = Bling BF
        row.getCell(colCategoriaModelo).value = categoria || "";

        // ✅ (1) Colunas ID TRAY e ID VAR = TEXTO "N TRAY" (em TODAS as linhas)
        row.getCell(colIdTray).value = "N TRAY";
        row.getCell(colIdVar).value = "N TRAY";

        // ✅ (3) Código/Quantidade a partir da Referência (barra "/" e qtd 12/6/3)
        const parsed = parseReferencia(referencia);

        // limpa os 10 pares antes de preencher
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
        processados++;

        console.log(
          categoria
            ? chalk.greenBright(`✅ [${processados}] ${nome} — Categoria(BF): ${categoria}`)
            : chalk.yellow(`⚠️ [${processados}] ${nome} — Categoria(BF) vazia`)
        );
      }

      // ✅ gera buffer direto (melhor para produção)
      const buffer = await workbook.xlsx.writeBuffer();

      // opcional: salvar também no disco
      const outputPath = path.resolve(
        "uploads",
        `AUTOMACAO-MODELO-${new Date().toLocaleDateString("pt-BR").replaceAll("/", "-")}.xlsx`
      );
      try {
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        console.log(chalk.greenBright(`📁 Arquivo salvo em: ${outputPath}`));
      } catch (e) {
        console.log(chalk.yellow("⚠️ Não foi possível salvar no disco (ok em produção)."));
      }

      console.log(chalk.cyanBright(`\n💾 ${processados} linhas gravadas com sucesso.\n`));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="AUTOMACAO-MODELO-${Date.now()}.xlsx"`
      );
      res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      console.error(chalk.redBright("🛑 Erro crítico:"), err);
      res.status(500).json({ error: err?.message || "Erro interno no servidor." });
    } finally {
      // ✅ limpa temporários do multer
      for (const p of filesToCleanup) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
  }
);

app.listen(5000, () =>
  console.log(
    chalk.magentaBright("🚀 Servidor rodando em http://localhost:5000/atualizar-planilha")
  )
);
