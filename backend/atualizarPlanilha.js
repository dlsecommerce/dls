const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

async function atualizarPlanilhaModelo({ modelo, bling, tray, vinculo }) {
  const workbook = new ExcelJS.Workbook();

  // 🔹 Abre o modelo preservando estilos
  await workbook.xlsx.readFile(modelo);
  const sheet = workbook.worksheets[0]; // primeira aba

  // Lê os outros CSVs
  const lerCSV = (arquivo) => {
    const texto = fs.readFileSync(arquivo, "utf8");
    const linhas = texto.split("\n").map((l) => l.split(";"));
    const headers = linhas[0];
    return linhas.slice(1).map((row) =>
      headers.reduce((acc, h, i) => ({ ...acc, [h.trim()]: row[i]?.trim() }), {})
    );
  };

  const blingData = lerCSV(bling);
  const trayData = lerCSV(tray);
  const vinculoData = lerCSV(vinculo);

  // 🔹 Remove linhas antigas (mantém cabeçalho)
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 2) row.eachCell((cell) => (cell.value = null));
  });

  // 🔹 Preenche com novos dados (a partir da linha 3)
  let currentRow = 3;

  for (let i = 0; i < vinculoData.length; i++) {
    const vinculo = vinculoData[i];
    const blingItem = blingData[i] || {};
    const trayItem = trayData.find(
      (t) =>
        t["IdProduto"] === vinculo["IdProduto"] ||
        t["Código"] === vinculo["Código"]
    ) || {};

    const novaLinha = {
      "ID Bling": vinculo["IdProduto"] || "",
      "Nome": vinculo["Nome"] || "",
      "Referência": vinculo["Código"] || "",
      "Marca": blingItem["Marca"] || "",
      "Categoria": blingItem["Categoria do produto"] || "",
      "Peso líquido (Kg)": blingItem["Peso líquido (Kg)"] || "",
      "Altura do Produto": blingItem["Altura do Produto"] || "",
      "Largura do produto": blingItem["Largura do produto"] || "",
      "Profundidade do produto": blingItem["Profundidade do produto"] || "",
      "Preço Tray": trayItem["Preço"] || "",
      "Estoque Tray": trayItem["Estoque"] || "",
      "Situação Tray": trayItem["Situação"] || "",
    };

    let colIndex = 1;
    for (const col of sheet.getRow(2).values.slice(1)) {
      sheet.getRow(currentRow).getCell(colIndex).value =
        novaLinha[col] || "";
      colIndex++;
    }

    currentRow++;
  }

  // 🔹 Salva arquivo temporário
  const resultPath = path.join(
    __dirname,
    "uploads",
    `AUTOMAÇÃO - MODELO - ${Date.now()}.xlsx`
  );
  await workbook.xlsx.writeFile(resultPath);
  return resultPath;
}

module.exports = { atualizarPlanilhaModelo };
