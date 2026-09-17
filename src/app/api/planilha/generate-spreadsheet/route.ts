// app/api/planilha/generate-spreadsheet/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

type Loja = "Pikot Shop" | "Sóbaquetas";

const BLING_COL = {
  ID: 0,
  CODIGO: 1,
  DESCRICAO: 2,
  MARCA: 38,
};

const HEADER_ROW = [
  "Loja",
  "ID Bling",
  "Referência",
  "Produto",
  "Marca",
  "Canal",
  "Código ID",
];

const HEADER_COLOR = "1A8CEB";

/**
 * Extrai a chave de agrupamento: primeiro número com 4+ dígitos
 * encontrado na referência. Funciona independente de prefixo
 * (PAI, VAR, FIS), separador (_, /, -) ou espaços extras.
 */
function extractGroupKey(referencia: string): string {
  const match = referencia.match(/\d{4,}/);
  return match ? match[0] : referencia.trim();
}

/**
 * Identifica se o texto do produto é apenas uma variação
 * de voltagem (ex: "Voltagem:127", "Voltagem: 220").
 */
function isVoltageOnlyTitle(produto: string): boolean {
  return /^voltagem\s*:/i.test(produto.trim());
}

/**
 * Faz o parse do campo "canais" enviado no FormData.
 * Aceita JSON.stringify de um array de strings.
 */
function parseCanais(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((c) => String(c ?? "").trim())
      .filter((c) => c.length > 0);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const loja = formData.get("loja") as Loja | null;
    const blingFile = formData.get("bling") as File | null;
    const canaisRaw = formData.get("canais") as string | null;

    if (!loja) {
      return NextResponse.json(
        { error: "Loja não informada." },
        { status: 400 }
      );
    }

    if (loja !== "Pikot Shop" && loja !== "Sóbaquetas") {
      return NextResponse.json({ error: "Loja inválida." }, { status: 400 });
    }

    if (!blingFile) {
      return NextResponse.json(
        { error: "Planilha Bling não enviada." },
        { status: 400 }
      );
    }

    const canais = parseCanais(canaisRaw);

    if (!canais.length) {
      return NextResponse.json(
        { error: "Selecione ao menos um canal." },
        { status: 400 }
      );
    }

    const arrayBuffer = await blingFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        { error: "Nenhuma aba encontrada na planilha Bling." },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as any[][];

    const dataRows = rawRows.filter((row) =>
      row.some((cell) => String(cell ?? "").trim() !== "")
    );

    const [, ...bodyRows] = dataRows;

    if (!bodyRows.length) {
      return NextResponse.json(
        { error: "Nenhum dado encontrado na planilha Bling." },
        { status: 400 }
      );
    }

    const missingIdRows: number[] = [];

    const parsedRows = bodyRows.map((row, index) => {
      const idBling = String(row[BLING_COL.ID] ?? "").trim();
      const referencia = String(row[BLING_COL.CODIGO] ?? "").trim();
      const produto = String(row[BLING_COL.DESCRICAO] ?? "").trim();
      const marca = String(row[BLING_COL.MARCA] ?? "").trim();

      if (!idBling) {
        missingIdRows.push(index + 2);
      }

      return { idBling, referencia, produto, marca };
    });

    if (missingIdRows.length > 0) {
      return NextResponse.json(
        {
          error: `A coluna "ID" (coluna A) está vazia nas linhas: ${missingIdRows
            .slice(0, 10)
            .join(", ")}${
            missingIdRows.length > 10 ? "..." : ""
          }. Verifique a planilha Bling.`,
        },
        { status: 400 }
      );
    }

    // Mapeia o título "real" de cada grupo (aquele que NÃO é "Voltagem:xxx")
    const masterTitleByKey = new Map<string, string>();

    for (const row of parsedRows) {
      const key = extractGroupKey(row.referencia);
      if (!key) continue;

      const alreadyHasMaster = masterTitleByKey.has(key);
      const isRealTitle = row.produto && !isVoltageOnlyTitle(row.produto);

      if (isRealTitle && !alreadyHasMaster) {
        masterTitleByKey.set(key, row.produto);
      }
    }

    // ✅ CORRIGIDO: canais concatenados numa única célula, mesmo
    // padrão usado em exportAnnounceModelo() e esperado por
    // normalizeChannelsCell() no import de announce. Gera 1 linha
    // por produto (não mais 1 linha por produto x canal).
    const canaisFormatados = canais.join(", ");

    const outputRows = parsedRows.map((row) => {
      let produtoFinal = row.produto;

      if (isVoltageOnlyTitle(row.produto)) {
        const key = extractGroupKey(row.referencia);
        const masterTitle = key ? masterTitleByKey.get(key) : undefined;

        if (masterTitle) {
          produtoFinal = masterTitle;
        }
      }

      return [
        loja,
        row.idBling,
        row.referencia,
        produtoFinal,
        row.marca,
        canaisFormatados,
        "",
      ];
    });

    const newWorkbook = new ExcelJS.Workbook();
    const worksheet = newWorkbook.addWorksheet("Planilha");

    worksheet.addRow(HEADER_ROW);
    outputRows.forEach((row) => worksheet.addRow(row));

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${HEADER_COLOR}` },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    worksheet.columns = [
      { width: 14 }, // Loja
      { width: 14 }, // ID Bling
      { width: 22 }, // Referência
      { width: 50 }, // Produto
      { width: 16 }, // Marca
      { width: 16 }, // Canal
      { width: 12 }, // Código ID
    ];

    const buffer = await newWorkbook.xlsx.writeBuffer();

    const dataHora = new Date()
      .toLocaleString("pt-BR")
      .replace(/[/,:\s]/g, "-");

    const lojaLabel = loja === "Pikot Shop" ? "PIKOT SHOP" : "SÓBAQUETAS";
    const nomeArquivo = `ANÚNCIOS - ${lojaLabel} - ${dataHora}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          nomeArquivo
        )}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar planilha:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a planilha." },
      { status: 500 }
    );
  }
}
