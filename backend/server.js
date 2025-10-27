import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import chalk from "chalk";
import he from "he"; // ✅ decodificador HTML

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

/** 📄 Lê CSV e converte em array de objetos */
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
    return obj;
  });
}

/** 🔤 Decodifica HTML e remove sujeiras (&otilde;, &ccedil;, etc.) */
function limparTexto(valor) {
  const texto = he.decode(String(valor || "").trim()).replace(/^&[a-z]+;$/i, "").trim();
  if (!texto || /^[^a-zA-Z0-9>]+$/.test(texto) || ["undefined", "null"].includes(texto.toLowerCase())) {
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
    .normalize("NFD") // separa acentos
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // remove símbolos
    .trim();
}
function normCode(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** 🔎 pick() aprimorado com tolerância a nomes parciais e variações */
function pick(obj, keyCandidates = []) {
  const map = new Map(Object.keys(obj || {}).map((k) => [normalize(k), obj[k]]));
  const allKeys = Array.from(map.keys());

  // 1️⃣ Tentativa exata (igual à antiga)
  for (const cand of keyCandidates) {
    const normCand = normalize(cand);
    const v = map.get(normCand);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }

  // 2️⃣ Tentativa parcial (colunas parecidas)
  for (const cand of keyCandidates) {
    const normCand = normalize(cand);
    const keyEncontrada = allKeys.find((k) => k.includes(normCand) || normCand.includes(k));
    if (keyEncontrada) {
      const v = map.get(keyEncontrada);
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        // console.log(`⚙️ Match parcial: "${cand}" ↔ "${keyEncontrada}"`);
        return v;
      }
    }
  }

  // 3️⃣ Tentativa genérica: se a palavra “categoria” aparecer no nome
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
      (b) => String(pick(b, ["ID", "Id", "Id Produto", "ID Produto"])).trim() === String(idProduto).trim()
    ) || null;
  if (prod) return prod;

  prod =
    bling.find((b) => {
      const codigo = pick(b, ["Código", "Codigo", "SKU"]) || "";
      const codNorm = normCode(codigo);
      return (
        (refNorm && codNorm && (refNorm === codNorm || refNorm === codNorm.replace(/^0+/, ""))) ||
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

/** 🚀 Endpoint principal */
app.post(
  "/atualizar-planilha",
  upload.fields([
    { name: "modelo" },
    { name: "bling" },
    { name: "tray" },
    { name: "vinculo" },
  ]),
  async (req, res) => {
    try {
      const modeloPath = req.files["modelo"]?.[0]?.path;
      const blingPath = req.files["bling"]?.[0]?.path;
      const trayPath = req.files["tray"]?.[0]?.path;
      const vinculoPath = req.files["vinculo"]?.[0]?.path;

      if (!modeloPath || !blingPath || !trayPath || !vinculoPath)
        throw new Error("⚠️ Envie Modelo, Bling, Tray e Vínculo.");

      const bling = lerCSV(blingPath);
      const tray = lerCSV(trayPath);
      const vinculo = lerCSV(vinculoPath);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(modeloPath);
      const sheet = workbook.worksheets[0];
      aplicarEstiloCabecalho(sheet);

      const headerMap = [];
      sheet.getRow(2).eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber >= 2) {
          const key = String(cell.value || "").trim();
          headerMap.push({ col: colNumber, key, norm: normalize(key) });
        }
      });

      const catHeader = headerMap.find((h) => h.norm === normalize("Categoria"));
      const colCategoriaModelo = catHeader?.col ?? null;

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

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) row.eachCell((cell) => (cell.value = null));
      });

      console.log(chalk.cyanBright("\n🚀 Iniciando automação de planilhas...\n"));

      let linhaAtual = 3;
      let processados = 0;

      for (const v of vinculo) {
        const idProduto = (v["IdProduto"] || "").toString().trim();
        const idLojaOriginal = (v["ID na Loja"] || "").toString().trim();
        const nomeVinculo = limparTexto((v["Nome"] || "").toString().trim());
        const referencia = (v["Código"] || "").toString().trim();
        const nome = nomeVinculo;

        const blProduto = encontrarProdutoNoBling(bling, { idProduto, referencia, nomeVinculo });

        // ✅ Categoria robusta
        let categoria = "";
        if (blProduto) {
          categoria =
            limparTexto(
              pick(blProduto, [
                "Categoria",
                "Categoria Produto",
                "Categoria do produto",
                "Categoria do Produto",
                "CategoriaProduto",
                "Categoria (Produto)",
                "Categoria.produto",
                "Categ",
              ])
            ) || "";

          categoria = categoria.replace(/\s*>>\s*/g, " » ").trim();

          if (!categoria) {
            const codigoPai = pick(blProduto, [
              "Código Pai",
              "Codigo Pai",
              "Código pai",
              "codigo pai",
            ]);
            if (codigoPai) {
              const prodPai = bling.find((b) => {
                const codigo = pick(b, ["Código", "Codigo", "SKU"]);
                return normCode(codigo) === normCode(codigoPai);
              });
              if (prodPai) {
                categoria =
                  limparTexto(
                    pick(prodPai, [
                      "Categoria",
                      "Categoria do produto",
                      "Categoria Produto",
                      "Categoria do Produto",
                      "CategoriaProduto",
                    ])
                  ) || "";
                categoria = categoria.replace(/\s*>>\s*/g, " » ").trim();
              }
            }
          }

          if (!categoria) {
            for (const [chave, valor] of Object.entries(blProduto)) {
              if (normalize(chave).includes("categoria") && valor) {
                categoria = limparTexto(valor).replace(/\s*>>\s*/g, " » ").trim();
                break;
              }
            }
          }
        }

        const idBling = pick(blProduto || {}, ["ID", "Id", "Id Produto", "ID Produto"]);
        const marca = limparTexto(pick(blProduto || {}, ["Marca"]));
        const peso = pick(blProduto || {}, ["Peso líquido (Kg)", "Peso Liquido (Kg)", "Peso líquido", "Peso"]);
        const largura = pick(blProduto || {}, ["Largura do produto", "Largura"]);
        const altura = pick(blProduto || {}, ["Altura do Produto", "Altura"]);
        const comprimento = pick(blProduto || {}, ["Profundidade do produto", "Comprimento", "Profundidade"]);

        let od = definirOD(nome);
        if (od === 3) od = definirOD(referencia);

        let idTray = idLojaOriginal;
        const group = normalize(baseNomeGrupo(nome));
        if (od === 2 && group && parentTrayByGroup.has(group)) {
          idTray = parentTrayByGroup.get(group) || idLojaOriginal;
        }

        let idVar;
        if (od === 1) idVar = "PAI";
        else if (od === 2) idVar = idLojaOriginal;
        else idVar = "SIMPLES";

        const loja = /\d/.test(idTray) ? "PK" : idTray ? "SB" : "NULL";

        const novaLinha = {
          ID: "",
          Loja: loja,
          "ID Bling": idBling,
          "ID Tray": idTray,
          Referência: referencia,
          "ID Var": idVar,
          OD: od,
          Nome: nome,
          Marca: marca,
          Categoria: categoria,
          Peso: peso,
          Largura: largura,
          Altura: altura,
          Comprimento: comprimento,
        };

        const row = sheet.getRow(linhaAtual);
        const novaLinhaNormMap = new Map(Object.keys(novaLinha).map((k) => [normalize(k), novaLinha[k]]));

        for (const { col, key, norm } of headerMap) {
          let valor =
            Object.prototype.hasOwnProperty.call(novaLinha, key) && novaLinha[key] !== undefined
              ? novaLinha[key]
              : undefined;
          if (valor === undefined) valor = novaLinhaNormMap.get(norm);
          row.getCell(col).value = valor !== undefined ? valor : "";
        }

        if (colCategoriaModelo) row.getCell(colCategoriaModelo).value = categoria || "";

        row.commit?.();
        linhaAtual++;
        processados++;

        console.log(
          categoria
            ? chalk.greenBright(`✅ [${processados}] ${nome} — Categoria: ${categoria}`)
            : chalk.yellow(`⚠️ [${processados}] ${nome} — Categoria não encontrada`)
        );
      }

      const outputPath = path.resolve(
        "uploads",
        `AUTOMAÇÃO - MODELO - ${new Date().toLocaleDateString("pt-BR").replaceAll("/", "-")}.xlsx`
      );

      await workbook.xlsx.writeFile(outputPath);
      console.log(chalk.cyanBright(`\n💾 ${processados} linhas gravadas com sucesso.`));
      console.log(chalk.greenBright(`📁 Arquivo salvo em: ${outputPath}\n`));

      const buffer = fs.readFileSync(outputPath);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="AUTOMACAO-MODELO-${Date.now()}.xlsx"`
      );
      res.send(buffer);
    } catch (err) {
      console.error(chalk.redBright("🛑 Erro crítico:"), err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.listen(5000, () =>
  console.log(chalk.magentaBright("🚀 Servidor rodando em http://localhost:5000\atualizar-planilha"))
);
