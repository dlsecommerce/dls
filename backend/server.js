import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

const app = express();
app.use(cors());

// 📂 Pasta temporária para uploads
const upload = multer({ dest: "uploads/" });

/** 🔹 Função auxiliar — lê CSV ou XLSX e converte para array de objetos */
async function lerPlanilha(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const workbook = new ExcelJS.Workbook();

  if (ext === ".csv") {
    const rows = [];
    const csvContent = fs.readFileSync(filePath, "utf-8").split("\n");
    const headers = csvContent[0].split(";").map((h) => h.trim());
    for (let i = 1; i < csvContent.length; i++) {
      const values = csvContent[i].split(";");
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((h, idx) => (obj[h] = values[idx]?.trim() || ""));
        rows.push(obj);
      }
    }
    return rows;
  } else {
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    return sheetToJson(sheet);
  }
}

/** 🔹 Converte planilha ExcelJS para JSON (lendo cabeçalhos da linha 2) */
function sheetToJson(sheet) {
  const rows = [];
  const headers = [];

  // Cabeçalhos na linha 2
  sheet.getRow(2).eachCell((cell) => {
    headers.push(String(cell.value || "").trim());
  });

  // Linhas a partir da linha 3
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 3) {
      const obj = {};
      row.eachCell((cell, colNumber) => {
        obj[headers[colNumber - 1]] = cell.value || "";
      });
      rows.push(obj);
    }
  });
  return rows;
}

/** 🔹 Endpoint principal — atualiza a planilha modelo */
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

      if (!modeloPath || !blingPath || !trayPath || !vinculoPath) {
        throw new Error("Arquivos ausentes — envie Modelo, Bling, Tray e Vínculo.");
      }

      // 🔹 Lê planilhas auxiliares
      const vinculo = await lerPlanilha(vinculoPath);
      const bling = await lerPlanilha(blingPath);
      const tray = await lerPlanilha(trayPath);

      // 🔹 Carrega o modelo mantendo o layout original
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(modeloPath);
      const sheet = workbook.worksheets[0];

      // Captura cabeçalhos (linha 2)
      const headers = [];
      sheet.getRow(2).eachCell((cell) => headers.push(String(cell.value || "").trim()));

      // Limpa conteúdo antigo a partir da linha 3 (mantendo formatação)
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) {
          row.eachCell((cell) => {
            cell.value = null;
          });
        }
      });

      // 🔹 Preenche novas linhas
      vinculo.forEach((item, i) => {
        const linha = {};

        linha["ID Bling"] = item["IdProduto"] || "";
        linha["Nome"] = item["Nome"] || "";
        linha["Referência"] = item["Código"] || "";

        const idLoja = (item["ID na Loja"] || "").toString();
        if (/\d{7}/.test(idLoja)) linha["ID Tray"] = idLoja;
        else if (/\d{5}/.test(idLoja)) linha["ID Var"] = idLoja;
        else linha["ID Tray"] = linha["ID Var"] = "";

        // 🔹 Dados do Bling
        const dadosBling = bling[i] || {};
        linha["Marca"] = dadosBling["Marca"] || "";
        linha["Categoria"] = dadosBling["Categoria do produto"] || "";
        linha["Peso líquido (Kg)"] = dadosBling["Peso líquido (Kg)"] || "";
        linha["Altura do Produto"] = dadosBling["Altura do Produto"] || "";
        linha["Largura do produto"] = dadosBling["Largura do produto"] || "";
        linha["Profundidade do produto"] = dadosBling["Profundidade do produto"] || "";

        // 🔹 Dados Tray correspondentes
        const matchTray =
          tray.find(
            (t) =>
              t["IdProduto"] === item["IdProduto"] ||
              t["Nome"] === item["Nome"] ||
              t["Código"] === item["Código"]
          ) || {};

        linha["Preço Tray"] = matchTray["Preço"] || "";
        linha["Estoque Tray"] = matchTray["Estoque"] || "";
        linha["Situação Tray"] = matchTray["Situação"] || "";

        const rowValues = headers.map((h) => linha[h] || "");
        sheet.addRow(rowValues);
      });

      // 🔹 Salva planilha atualizada com timestamp
      const outputPath = path.resolve(
        "uploads",
        `AUTOMAÇÃO - MODELO - ${new Date()
          .toLocaleDateString("pt-BR")
          .replaceAll("/", "-")}.xlsx`
      );

      await workbook.xlsx.writeFile(outputPath);
      console.log("✅ Planilha modelo atualizada:", outputPath);

      res.download(outputPath);
    } catch (error) {
      console.error("🛑 Erro ao atualizar:", error);
      res.status(500).json({
        error: error.message || "Erro ao atualizar planilha modelo",
      });
    }
  }
);

// 🚀 Inicializa servidor
app.listen(5000, () =>
  console.log("✅ Servidor rodando em http://localhost:5000")
);
