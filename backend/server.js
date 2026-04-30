import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import chalk from "chalk";
import he from "he";
import { parse as parseCsv } from "csv-parse/sync";

const app = express();

/**
 * ✅ Render/Node backend
 * - Este arquivo é para rodar no Render, NÃO na Vercel.
 * - No Render usamos app.listen(PORT).
 * - A rota da automação é /atualizar-planilha.
 */

const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * ✅ CORS
 * Em produção, coloque seu domínio em ALLOWED_ORIGINS no Render:
 * ALLOWED_ORIGINS=https://dlsecommerce.vercel.app
 */
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "https://dlsecommerce.vercel.app"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const isLocal =
        origin.includes("http://localhost") ||
        origin.includes("http://127.0.0.1");

      if (ALLOWED_ORIGINS.includes(origin) || isLocal) {
        return cb(null, true);
      }

      return cb(new Error("CORS bloqueado para: " + origin));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// ✅ mantém uploads em disco no Render
const upload = multer({ dest: uploadDir });

/** ✅ Rota teste para verificar se o Render subiu */
app.get("/", (req, res) => {
  res.send("API da automação rodando ✅");
});

/** 🔤 Normalização */
function normalize(s = "") {
  return String(s)
    .replace(/\u00a0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normCode(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * ✅ SANITIZA TEXTO PARA EXCEL
 */
function textoSeguroExcel(v) {
  if (v === null || v === undefined) return "";
  let s = String(v);

  s = s.replace(/\u00a0/g, " ");
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  const low = s.trim().toLowerCase();
  if (low === "undefined" || low === "null") return "";

  return s.trim();
}

/**
 * ✅ CONVERSOR NUMÉRICO SEGURO
 */
function numeroSeguro(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s0 = String(v).replace(/\u00a0/g, " ").trim();
  if (!s0) return null;

  const s1 = s0.replace(/[^\d.,-]/g, "");

  let s;
  if (s1.includes(",") && s1.includes(".")) {
    s = s1.replace(/\./g, "").replace(",", ".");
  } else if (s1.includes(",")) {
    s = s1.replace(",", ".");
  } else {
    s = s1;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** ✅ Valor final seguro pra célula */
function valorSeguroExcel(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v : "";

  if (typeof v === "object") {
    try {
      return textoSeguroExcel(JSON.stringify(v));
    } catch {
      return "";
    }
  }

  return textoSeguroExcel(v);
}

/** 📄 Lê CSV e converte em array de objetos */
function lerCSV(filePath) {
  const texto = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");

  const rows = parseCsv(texto, {
    delimiter: ";",
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h) => textoSeguroExcel(h));

  const data = rows.slice(1).map((colsRaw) => {
    const cols = Array.isArray(colsRaw) ? [...colsRaw] : [];
    while (cols.length < headers.length) cols.push("");

    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    obj.__cols = cols;
    return obj;
  });

  data.__headers = headers;
  return data;
}

/** 🔤 Decodifica HTML e remove sujeiras */
function limparTexto(valor) {
  const texto = he
    .decode(textoSeguroExcel(valor))
    .replace(/^&[a-z]+;$/i, "")
    .trim();

  const up = texto.toUpperCase();
  if (up === "NÃO" || up === "NAO") return "";

  if (
    !texto ||
    /^[^a-zA-Z0-9>À-ÿ]+$/.test(texto) ||
    ["undefined", "null"].includes(texto.toLowerCase())
  ) {
    return "";
  }

  return textoSeguroExcel(texto);
}

/** 🧠 Define OD: 1 = PAI, 2 = VAR, 3 = SIMPLES */
function definirOD(ref) {
  if (!ref) return 3;
  const r = String(ref).toUpperCase();
  if (r.includes("PAI -")) return 1;
  if (r.includes("VAR -")) return 2;
  return 3;
}

/** ✅ headerMap robusto */
function buildHeaderMap(sheet, headerRowNumber = 2) {
  const headerMap = [];
  const headerRow = sheet.getRow(headerRowNumber);
  const maxCol = sheet.columnCount || headerRow.cellCount || 200;

  for (let col = 1; col <= maxCol; col++) {
    const cell = headerRow.getCell(col);
    let value = cell?.value;

    if (value && typeof value === "object" && value.richText) {
      value = value.richText.map((t) => t.text).join("");
    }

    const key = textoSeguroExcel(value);
    if (key) headerMap.push({ col, key, norm: normalize(key) });
  }

  return headerMap;
}

/** 🔎 pick() com tolerância */
function pick(obj, keyCandidates = []) {
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
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: azulEscuro },
    };
  }

  sheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: azulEscuro },
    };
    cell.font = { color: { argb: branco }, bold: true, size: 12 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  sheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: azulClaro },
    };
    cell.font = { color: { argb: branco }, bold: true, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
}

/**
 * ✅ OTIMIZAÇÃO FORTE:
 * Cria índices do Bling uma única vez.
 * Evita fazer bling.find() milhares de vezes.
 */
function criarIndicesBling(bling) {
  const byId = new Map();
  const byCodigo = new Map();
  const byCodigoSemZero = new Map();
  const byNomeExato = new Map();
  const nomes = [];

  for (const b of bling) {
    const id = textoSeguroExcel(
      pick(b, ["ID", "Id", "Id Produto", "ID Produto"])
    );

    if (id) byId.set(String(id).trim(), b);

    const codigo = textoSeguroExcel(pick(b, ["Código", "Codigo", "SKU"]) || "");
    const codNorm = normCode(codigo);

    if (codNorm) {
      byCodigo.set(codNorm, b);

      const semZero = codNorm.replace(/^0+/, "");
      if (semZero) byCodigoSemZero.set(semZero, b);
    }

    const nomeBling = textoSeguroExcel(
      pick(b, ["Descrição", "Descricao", "Nome"]) || ""
    );
    const nomeNormBling = normalize(nomeBling);

    if (nomeNormBling) {
      byNomeExato.set(nomeNormBling, b);
      nomes.push({ nomeNormBling, produto: b });
    }
  }

  return {
    byId,
    byCodigo,
    byCodigoSemZero,
    byNomeExato,
    nomes,
  };
}

/** 🔎 Busca rápida no Bling usando os índices */
function encontrarProdutoNoBlingRapido(indices, { idProduto, referencia, nomeVinculo }) {
  const id = String(idProduto || "").trim();
  const refNorm = normCode(referencia);
  const nomeNormVinc = normalize(nomeVinculo);

  if (id && indices.byId.has(id)) {
    return indices.byId.get(id);
  }

  if (refNorm) {
    if (indices.byCodigo.has(refNorm)) {
      return indices.byCodigo.get(refNorm);
    }

    const semZero = refNorm.replace(/^0+/, "");
    if (semZero && indices.byCodigoSemZero.has(semZero)) {
      return indices.byCodigoSemZero.get(semZero);
    }
  }

  if (nomeNormVinc && indices.byNomeExato.has(nomeNormVinc)) {
    return indices.byNomeExato.get(nomeNormVinc);
  }

  /**
   * Fallback por nome aproximado.
   * Para performance, só roda quando não encontrou por ID/código.
   */
  if (nomeNormVinc) {
    const achado = indices.nomes.find(
      (x) =>
        x.nomeNormBling.includes(nomeNormVinc) ||
        nomeNormVinc.includes(x.nomeNormBling)
    );

    if (achado) return achado.produto;
  }

  return null;
}

/** ✅ Descobre índice da coluna "Categoria do produto" */
function getCategoriaIndex(blingHeaders = []) {
  if (!Array.isArray(blingHeaders) || blingHeaders.length === 0) return -1;

  const normHeaders = blingHeaders.map((h) => normalize(h));

  let idx = normHeaders.findIndex((h) => h === normalize("Categoria do produto"));
  if (idx >= 0) return idx;

  idx = normHeaders.findIndex(
    (h) => h.includes("categoria") && h.includes("produto")
  );
  if (idx >= 0) return idx;

  idx = normHeaders.findIndex((h) => h === "categoria" || h.includes("categoria"));
  if (idx >= 0) return idx;

  return -1;
}

/**
 * ✅ Categoria do produto do Bling
 * Agora pega apenas o FINAL da categoria.
 * Ex:
 * "Máquinas & Ferramentas » Ferrementas & Utensílios » Martelos & Marteletes"
 * retorna:
 * "Martelos & Marteletes"
 */
function getCategoriaFinal(categoriaRaw) {
  const categoria = limparTexto(categoriaRaw);
  if (!categoria) return "";

  const normalizada = categoria.replace(/\s*>>\s*/g, " » ").trim();

  const partes = normalizada
    .split("»")
    .map((p) => textoSeguroExcel(p))
    .filter(Boolean);

  if (partes.length === 0) return "";

  return partes[partes.length - 1];
}

function getCategoriaFromBling(blingProd, categoriaIdx) {
  if (!blingProd || typeof categoriaIdx !== "number" || categoriaIdx < 0) {
    return "";
  }

  const raw = blingProd.__cols?.[categoriaIdx];
  return getCategoriaFinal(raw);
}

/**
 * ✅ Normaliza item da referência para código + quantidade
 *
 * Regras:
 * - DWT-6005150127      => código 6005150127, qtd 1
 * - FIS-3570-2345       => código 3570-2345, qtd 1
 * - 3-3570-2345         => código 3570-2345, qtd 3
 * - 36450-104456        => código 36450-104456, qtd 1
 * - PAI - DWT-600       => código 600, qtd 1
 * - VAR - FIS-3570-2345 => código 3570-2345, qtd 1
 */
function parseItemReferencia(itemRaw) {
  const original = textoSeguroExcel(itemRaw);
  if (!original) return null;

  const parts = original
    .split("-")
    .map((s) => textoSeguroExcel(s))
    .filter(Boolean);

  if (parts.length === 0) return null;

  let qtd = 1;
  let codeParts = [...parts];

  const first = parts[0];

  /**
   * Quantidade:
   * Só considera quantidade se o primeiro pedaço for número pequeno.
   * Assim:
   * 3-3570-2345 => qtd 3
   * 36450-104456 => NÃO vira qtd 36450
   */
  if (/^\d+$/.test(first)) {
    const n = parseInt(first, 10);

    if (n >= 2 && n <= 500 && parts.length >= 2) {
      qtd = n;
      codeParts = parts.slice(1);
    }
  } else if (/^[a-zA-Z]{2,10}$/.test(first) && parts.length >= 2) {
    /**
     * Prefixo de marca:
     * DWT-6005150127 => remove DWT
     * FIS-3570-2345 => remove FIS
     */
    codeParts = parts.slice(1);
  }

  const codigo = textoSeguroExcel(codeParts.join("-"));

  if (!codigo) return null;

  return {
    codigo,
    qtd,
  };
}

/** ✅ PARSE DA REFERÊNCIA PARA CÓDIGO/QUANTIDADE */
function parseReferencia(refRaw) {
  const ref = textoSeguroExcel(refRaw);
  if (!ref) return [];

  const limpo = ref.replace(/^\s*(PAI|VAR)\s*-\s*/i, "").trim();

  const items = limpo
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];

  for (const item of items) {
    const parsed = parseItemReferencia(item);
    if (parsed) out.push(parsed);
  }

  return out;
}

/** acha coluna pelo nome no headerMap */
function findCol(headerMap, name) {
  const n = normalize(name);
  const h = headerMap.find((x) => x.norm === n);
  return h?.col ?? null;
}

/** ✅ pega ID na loja do vínculo */
function getIdNaLoja(v) {
  const val = pick(v, [
    "ID na Loja",
    "ID na Loja Multiloja",
    "ID na Loja (Multiloja)",
    "ID Loja",
    "ID Loja Multiloja",
    "Id na loja",
    "Id na loja multiloja",
  ]);

  return textoSeguroExcel(val);
}

/** ✅ pega Código do vínculo */
function getCodigoVinculo(v) {
  const val = pick(v, ["Código", "Codigo", "SKU", "Referência", "Referencia"]);
  return textoSeguroExcel(val);
}

/** ✅ pega Nome do vínculo */
function getNomeVinculo(v) {
  const val = pick(v, ["Nome", "Descrição", "Descricao", "Titulo", "Título"]);
  return limparTexto(val);
}

/** 🚀 Endpoint principal - Render */
app.post(
  "/atualizar-planilha",
  upload.fields([
    { name: "modelo" },
    { name: "bling" },
    { name: "tray" },
    { name: "vinculo" },
  ]),
  async (req, res) => {
    const inicio = Date.now();
    const filesToCleanup = [];

    try {
      const lojaRaw = textoSeguroExcel(req.body?.loja || "");
      const lojaNorm = normalize(lojaRaw);
      const isPikot = lojaNorm.includes("pikot");

      const modeloPath = req.files?.["modelo"]?.[0]?.path;
      const blingPath = req.files?.["bling"]?.[0]?.path;
      const trayPath = req.files?.["tray"]?.[0]?.path;
      const vinculoPath = req.files?.["vinculo"]?.[0]?.path;

      if (modeloPath) filesToCleanup.push(modeloPath);
      if (blingPath) filesToCleanup.push(blingPath);
      if (trayPath) filesToCleanup.push(trayPath);
      if (vinculoPath) filesToCleanup.push(vinculoPath);

      if (!modeloPath || !blingPath || !vinculoPath) {
        throw new Error("⚠️ Envie Modelo, Bling e Vínculo.");
      }

      console.log(chalk.cyanBright("\n🚀 Iniciando automação otimizada...\n"));

      const bling = lerCSV(blingPath);
      const indicesBling = criarIndicesBling(bling);

      const blingHeaders = bling.__headers || [];
      const categoriaIdx = getCategoriaIndex(blingHeaders);

      console.log(
        chalk.magentaBright(
          `🧾 BLING: linhas=${bling.length} | headers=${blingHeaders.length} | categoriaIdx=${categoriaIdx} | header="${
            blingHeaders[categoriaIdx] || "NÃO ENCONTRADO"
          }"`
        )
      );

      const vinculo = lerCSV(vinculoPath);

      // Tray mantido como opcional, mas não precisa ser varrido no fluxo atual.
      if (trayPath) {
        console.log(chalk.gray("📄 Tray recebido."));
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(modeloPath);

      const sheet = workbook.worksheets[0];

      aplicarEstiloCabecalho(sheet);

      const headerMap = buildHeaderMap(sheet, 2);

      const colCategoriaModelo = 10;

      const colIdTray =
        findCol(headerMap, "ID Tray") || findCol(headerMap, "ID TRAY");

      const colIdVar =
        findCol(headerMap, "ID Var") || findCol(headerMap, "ID VAR");

      if (!colIdTray) {
        throw new Error("Coluna 'ID Tray' não encontrada no MODELO.");
      }

      if (!colIdVar) {
        throw new Error("Coluna 'ID Var' não encontrada no MODELO.");
      }

      const colReferencia =
        findCol(headerMap, "Referência") || findCol(headerMap, "Referencia");

      if (!colReferencia) {
        throw new Error("Coluna 'Referência' não encontrada no MODELO.");
      }

      const codigoCols = [];
      const quantCols = [];

      for (let i = 1; i <= 10; i++) {
        const c =
          findCol(headerMap, `Código ${i}`) ||
          findCol(headerMap, `Codigo ${i}`) ||
          findCol(headerMap, `Cód. ${i}`) ||
          findCol(headerMap, `Cod. ${i}`);

        const q =
          findCol(headerMap, `Quantidade ${i}`) ||
          findCol(headerMap, `Quant. ${i}`) ||
          findCol(headerMap, `Quant ${i}`) ||
          findCol(headerMap, `Qtd. ${i}`) ||
          findCol(headerMap, `Qtd ${i}`);

        if (!c || !q) {
          const colsDisponiveis = headerMap.map((h) => h.key).join(" | ");

          throw new Error(
            `Colunas 'Código ${i}' e/ou 'Quantidade/Quant. ${i}' não encontradas no MODELO.\n` +
              `Headers detectados (linha 2): ${colsDisponiveis}`
          );
        }

        codigoCols.push(c);
        quantCols.push(q);
      }

      /**
       * ✅ Limpa conteúdo antigo.
       * Mantém estilos do modelo.
       */
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) {
          row.eachCell((cell) => {
            cell.value = null;
          });
        }
      });

      console.log(
        chalk.cyanBright(
          `Loja: ${lojaRaw || "NÃO INFORMADA"} | Vínculos: ${vinculo.length}\n`
        )
      );

      /**
       * ✅ Índice de PAI por grupo.
       * Uma passada só.
       */
      const parentTrayByGroup = new Map();

      for (const v of vinculo) {
        const idLoja = getIdNaLoja(v);
        const nome = getNomeVinculo(v);
        const referencia = getCodigoVinculo(v);

        const od =
          definirOD(nome) !== 3 ? definirOD(nome) : definirOD(referencia);

        if (od === 1) {
          const group = normalize(baseNomeGrupo(nome));
          if (group) parentTrayByGroup.set(group, idLoja);
        }
      }

      let linhaAtual = 3;
      let processados = 0;
      let semCategoria = 0;
      let semBling = 0;

      for (const v of vinculo) {
        const idProduto = textoSeguroExcel(
          pick(v, ["IdProduto", "ID Produto", "Id Produto", "ID"]) ||
            v["IdProduto"] ||
            ""
        );

        const idLojaOriginal = getIdNaLoja(v);
        const nomeVinculo = getNomeVinculo(v);
        const referencia = getCodigoVinculo(v);
        const nome = nomeVinculo;

        const blProduto = encontrarProdutoNoBlingRapido(indicesBling, {
          idProduto,
          referencia,
          nomeVinculo,
        });

        if (!blProduto) semBling++;

        const categoria = getCategoriaFromBling(blProduto, categoriaIdx);
        if (!categoria) semCategoria++;

        let od = definirOD(nome);
        if (od === 3) od = definirOD(referencia);

        let idTrayCalc = idLojaOriginal;
        const group = normalize(baseNomeGrupo(nome));

        if (od === 2 && group && parentTrayByGroup.has(group)) {
          idTrayCalc = parentTrayByGroup.get(group) || idLojaOriginal;
        }

        let idVarCalc;

        if (od === 1) idVarCalc = "PAI";
        else if (od === 2) idVarCalc = idLojaOriginal;
        else idVarCalc = "SIMPLES";

        const novaLinha = {
          ID: "",
          Loja: /\d/.test(String(idTrayCalc || ""))
            ? "PK"
            : idTrayCalc
            ? "SB"
            : "NULL",
          "ID Bling": textoSeguroExcel(
            pick(blProduto || {}, ["ID", "Id", "Id Produto", "ID Produto"])
          ),
          "ID Tray": textoSeguroExcel(idTrayCalc),
          Referência: textoSeguroExcel(referencia),
          "ID Var": textoSeguroExcel(idVarCalc),
          OD: od,
          Nome: textoSeguroExcel(nome),
          Marca: textoSeguroExcel(limparTexto(pick(blProduto || {}, ["Marca"]))),
          Categoria: textoSeguroExcel(categoria),

          Peso: numeroSeguro(
            pick(blProduto || {}, [
              "Peso líquido (Kg)",
              "Peso Liquido (Kg)",
              "Peso líquido",
              "Peso",
            ])
          ),

          Largura: numeroSeguro(
            pick(blProduto || {}, ["Largura do produto", "Largura"])
          ),

          Altura: numeroSeguro(
            pick(blProduto || {}, ["Altura do Produto", "Altura"])
          ),

          Comprimento: numeroSeguro(
            pick(blProduto || {}, [
              "Profundidade do produto",
              "Comprimento",
              "Profundidade",
            ])
          ),
        };

        const row = sheet.getRow(linhaAtual);

        const novaLinhaNormMap = new Map(
          Object.keys(novaLinha).map((k) => [normalize(k), novaLinha[k]])
        );

        for (const { col, key, norm } of headerMap) {
          let valor =
            Object.prototype.hasOwnProperty.call(novaLinha, key) &&
            novaLinha[key] !== undefined
              ? novaLinha[key]
              : undefined;

          if (valor === undefined) valor = novaLinhaNormMap.get(norm);

          row.getCell(col).value = valorSeguroExcel(valor);
        }

        row.getCell(colCategoriaModelo).value = textoSeguroExcel(categoria || "");

        if (isPikot) {
          const trayClean = textoSeguroExcel(idTrayCalc);
          const varClean = textoSeguroExcel(idLojaOriginal);

          row.getCell(colIdTray).value = trayClean || "";

          if (od === 2) {
            row.getCell(colIdVar).value = varClean || "";
          } else if (od === 1) {
            row.getCell(colIdVar).value = "PAI";
          } else {
            row.getCell(colIdVar).value = "SIMPLES";
          }
        } else {
          row.getCell(colIdTray).value = "N TRAY";
          row.getCell(colIdVar).value = "N TRAY";
        }

        const parsed = parseReferencia(referencia);

        for (let i = 0; i < 10; i++) {
          row.getCell(codigoCols[i]).value = null;
          row.getCell(quantCols[i]).value = null;
        }

        for (let i = 0; i < Math.min(parsed.length, 10); i++) {
          row.getCell(codigoCols[i]).value = textoSeguroExcel(parsed[i].codigo);
          row.getCell(quantCols[i]).value = Number(parsed[i].qtd || 1);
        }

        row.commit?.();

        linhaAtual++;
        processados++;

        /**
         * ✅ Log leve para performance.
         * Não imprime toda linha.
         */
        if (processados % 500 === 0) {
          console.log(chalk.cyanBright(`Processados: ${processados}`));
        }
      }

      /**
       * ✅ Não salva cópia extra no disco.
       * Ganha performance.
       */
      const buffer = await workbook.xlsx.writeBuffer();

      const duracaoSeg = ((Date.now() - inicio) / 1000).toFixed(2);

      console.log(
        chalk.greenBright(
          `\n💾 ${processados} linhas gravadas com sucesso em ${duracaoSeg}s.`
        )
      );

      if (semBling > 0) {
        console.log(chalk.yellow(`⚠️ Produtos não encontrados no Bling: ${semBling}`));
      }

      if (semCategoria > 0) {
        console.log(chalk.yellow(`⚠️ Linhas com categoria vazia: ${semCategoria}`));
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="AUTOMACAO - MODELO - ${Date.now()}.xlsx"`
      );

      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      console.error(chalk.redBright("🛑 Erro crítico:"), err);

      return res.status(500).json({
        error: err?.message || "Erro interno no servidor.",
      });
    } finally {
      for (const p of filesToCleanup) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(chalk.magentaBright(`🚀 Servidor rodando na porta ${PORT}`))
);