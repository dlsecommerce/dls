import ExcelJS from "exceljs";

/**
 * Regras implementadas:
 * 1) ID TRAY e ID VAR = "N TRAY" em todas as linhas com dados
 * 2) Categoria (coluna J do Modelo) = Bling coluna BF
 * 3) Código/Quantidade a partir da Referência:
 *    - separador múltiplos itens: "/"
 *    - detecta quantidade quando existir como token numérico antes do código final
 *    - exemplos:
 *      - liv-12-11766 => [{codigo:"11766", qtd:12}]
 *      - all black/gaita => [{codigo:"all black", qtd:1},{codigo:"gaita", qtd:1}]
 */
export async function processarPlanilha({
  loja,
  modeloBuffer,
  blingBuffer,
  trayBuffer, // (opcional, não necessário pra essas regras)
  vinculoBuffer, // (opcional)
}) {
  const wbModelo = new ExcelJS.Workbook();
  await wbModelo.xlsx.load(modeloBuffer);

  const wbBling = new ExcelJS.Workbook();
  await wbBling.xlsx.load(blingBuffer);

  // ✅ Ajuste: pega primeira aba por padrão (troque se você usa nome fixo)
  const wsModelo = wbModelo.worksheets[0];
  const wsBling = wbBling.worksheets[0];

  // --- Helpers de header ---
  const HEADER_ROW = 2; // você já comentou que a linha 2 tem nomes reais
  const FIRST_DATA_ROW = HEADER_ROW + 1;

  const headerMapModelo = buildHeaderMap(wsModelo, HEADER_ROW);
  const headerMapBling = buildHeaderMap(wsBling, HEADER_ROW); // se no Bling também for na 2, ok

  // ✅ Colunas fixas do seu pedido
  const colIdTray = mustCol(headerMapModelo, "ID TRAY");
  const colIdVar = mustCol(headerMapModelo, "ID VAR");

  // Coluna J do modelo é “Categoria” (você disse explicitamente)
  const colCategoriaModelo = 10; // J = 10

  // Bling BF = 58 (A=1)
  const colCategoriaBlingBF = 58;

  // Código/Quant: vamos tentar achar "Código 1"..."Código 10" e "Quant. 1"..."Quant. 10"
  const codeCols = [];
  const qtdCols = [];
  for (let i = 1; i <= 10; i++) {
    codeCols.push(mustCol(headerMapModelo, `Código ${i}`));
    qtdCols.push(mustCol(headerMapModelo, `Quant. ${i}`));
  }

  // Referência no modelo: tentamos localizar por header
  // (se no seu modelo isso tiver outro nome, adiciona aqui)
  const colReferenciaModelo =
    headerMapModelo["REFERÊNCIA"] ??
    headerMapModelo["REFERENCIA"] ??
    headerMapModelo["Referência"] ??
    headerMapModelo["Referencia"];

  if (!colReferenciaModelo) {
    throw new Error(
      "Não encontrei a coluna 'Referência' no MODELO. Ajuste o nome no processarPlanilha.js"
    );
  }

  // --- Mapa de Bling para Categoria ---
  // Precisamos “casar” a linha do Modelo com a linha do Bling.
  // Como você não descreveu a chave de relacionamento aqui, eu implementei assim:
  // - usa um campo ID comum (preferência: "ID BLING" ou "ID GERAL") se existir no modelo e no bling
  // Se não existir, eu aplico categoria por "mesma linha" (fallback), mas isso só funciona se estiver alinhado.
  const chaveModelo =
    headerMapModelo["ID BLING"] ??
    headerMapModelo["ID GERAL"] ??
    headerMapModelo["ID"] ??
    null;

  const chaveBling =
    headerMapBling["ID"] ??
    headerMapBling["ID BLING"] ??
    headerMapBling["Código"] ??
    headerMapBling["Codigo"] ??
    null;

  const blingCategoriaByKey = new Map();

  if (chaveModelo && chaveBling) {
    // monta mapa key -> categoria(BF)
    for (let r = FIRST_DATA_ROW; r <= wsBling.rowCount; r++) {
      const row = wsBling.getRow(r);
      const key = normKey(row.getCell(chaveBling).value);
      if (!key) continue;
      const cat = valueToString(row.getCell(colCategoriaBlingBF).value);
      if (cat) blingCategoriaByKey.set(key, cat);
    }
  }

  // --- Processa linhas do modelo ---
  for (let r = FIRST_DATA_ROW; r <= wsModelo.rowCount; r++) {
    const rowM = wsModelo.getRow(r);

    // "linha com dados": checa se tem algo significativo (ex: primeira célula preenchida)
    const hasData = rowHasData(rowM);
    if (!hasData) continue;

    // ✅ 1) ID TRAY e ID VAR = "N TRAY"
    rowM.getCell(colIdTray).value = "N TRAY";
    rowM.getCell(colIdVar).value = "N TRAY";

    // ✅ 2) Categoria J = Bling BF
    let categoria = "";

    if (chaveModelo && chaveBling && blingCategoriaByKey.size > 0) {
      const key = normKey(rowM.getCell(chaveModelo).value);
      if (key && blingCategoriaByKey.has(key)) {
        categoria = blingCategoriaByKey.get(key);
      }
    }

    // fallback (se não achou chave): tenta alinhar mesma linha do bling
    if (!categoria) {
      const rowB = wsBling.getRow(r);
      categoria = valueToString(rowB?.getCell(colCategoriaBlingBF)?.value);
    }

    if (categoria) rowM.getCell(colCategoriaModelo).value = categoria;

    // ✅ 3) Código/Quantidade a partir da Referência
    const ref = valueToString(rowM.getCell(colReferenciaModelo).value);
    const parsed = parseReferencia(ref);

    // limpa campos antes de preencher
    for (let i = 0; i < 10; i++) {
      rowM.getCell(codeCols[i]).value = null;
      rowM.getCell(qtdCols[i]).value = null;
    }

    for (let i = 0; i < Math.min(parsed.length, 10); i++) {
      rowM.getCell(codeCols[i]).value = parsed[i].codigo;
      rowM.getCell(qtdCols[i]).value = parsed[i].qtd;
    }

    rowM.commit();
  }

  // gera saída
  const out = await wbModelo.xlsx.writeBuffer();
  return Buffer.from(out);
}

// ----------------- helpers -----------------

function buildHeaderMap(ws, headerRow) {
  const row = ws.getRow(headerRow);
  const map = {};
  for (let c = 1; c <= row.cellCount; c++) {
    const v = row.getCell(c).value;
    const key = valueToString(v);
    if (!key) continue;
    // guarda várias variações, mas prioriza uppercase para lookup
    map[key] = c;
    map[key.toUpperCase()] = c;
  }
  return map;
}

function mustCol(map, headerName) {
  const c =
    map[headerName] ||
    map[headerName.toUpperCase()] ||
    map[headerName.toLowerCase()] ||
    null;
  if (!c) throw new Error(`Coluna '${headerName}' não encontrada no MODELO.`);
  return c;
}

function valueToString(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    // exceljs pode retornar { richText }, { formula }, { text }, etc
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v.formula != null && v.result != null) return String(v.result);
    if (Array.isArray(v.richText))
      return v.richText.map((x) => x.text).join("");
  }
  return String(v).trim();
}

function normKey(v) {
  const s = valueToString(v);
  if (!s) return "";
  return s.trim().toUpperCase();
}

function rowHasData(row) {
  // considera "tem dados" se tiver qualquer célula preenchida nas primeiras 20 colunas
  const maxCheck = Math.min(row.cellCount || 0, 20);
  for (let c = 1; c <= maxCheck; c++) {
    const v = row.getCell(c).value;
    if (valueToString(v)) return true;
  }
  return false;
}

/**
 * Parse da referência:
 * - separa itens por "/"
 * - para cada item:
 *   - se tiver padrão com "-" e tiver um número (12,6,3,etc) como token e o último token for código (ex 11766),
 *     usa qtd = número e codigo = último token
 *   - senão, qtd = 1 e codigo = item (texto inteiro)
 *
 * Ex:
 *  "liv-12-11766" => codigo=11766 qtd=12
 *  "liv-6-ABCD"   => codigo=ABCD qtd=6
 *  "all black/gaita" => ["all black"(1), "gaita"(1)]
 */
function parseReferencia(refRaw) {
  const ref = (refRaw || "").trim();
  if (!ref) return [];

  const items = ref.split("/").map((s) => s.trim()).filter(Boolean);
  const out = [];

  for (const item of items) {
    const parts = item.split("-").map((s) => s.trim()).filter(Boolean);

    if (parts.length >= 2) {
      // procura quantidade numérica em qualquer token (geralmente penúltimo)
      // e pega o último token como código
      const last = parts[parts.length - 1];
      let qtd = 1;

      // procura o primeiro token numérico (ex 12, 6, 3)
      for (let i = 0; i < parts.length - 1; i++) {
        if (/^\d+$/.test(parts[i])) {
          qtd = parseInt(parts[i], 10);
          break;
        }
      }

      // se achou qtd numérica e existe last como código
      if (qtd > 1 && last) {
        out.push({ codigo: last, qtd });
        continue;
      }

      // Caso: "pai - liv-12-11766" você citou que sempre tem o número.
      // Se vier "liv-12-11766" com qtd=12, cai no bloco acima.
    }

    // fallback: item é o próprio código, qtd 1
    out.push({ codigo: item, qtd: 1 });
  }

  return out;
}
