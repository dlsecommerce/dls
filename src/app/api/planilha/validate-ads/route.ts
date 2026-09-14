// app/api/planilha/validate-ads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'newsystem' } }
);

interface InputRow {
  store: string;
  reference: string;
  id_bling: string;
}

interface ResultRow {
  store: string;
  reference: string;
  ja_esta_ativo: string;
  status: string;
  total_itens: number | null;
  itens_sem_custo: number | null;
  observacao: string;
}

interface ItemRow {
  store: string;
  reference: string;
  item_code: string;
  item_product: string;
  quantidade: number;
  motivo: string;
  custo_atual: number | null;
}

interface ExistenceRow {
  store: string;
  reference: string;
  id_bling: string;
  existe: string;
  ativo: string | null;
  observacao: string;
}

type RawRow = Record<string, any>;

function normalizeKey(key: string) {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const STORE_ALIASES = ['store', 'loja'];
const REFERENCE_ALIASES = ['reference', 'referencia'];
const ID_BLING_ALIASES = ['id_bling', 'idbling', 'id bling'];

function mapRow(raw: RawRow): InputRow {
  const normalized: Record<string, any> = {};
  for (const key of Object.keys(raw)) {
    normalized[normalizeKey(key)] = raw[key];
  }
  const storeKey = STORE_ALIASES.find((k) => normalized[k] !== undefined);
  const referenceKey = REFERENCE_ALIASES.find((k) => normalized[k] !== undefined);
  const idBlingKey = ID_BLING_ALIASES.find((k) => normalized[k] !== undefined);

  return {
    store: storeKey ? String(normalized[storeKey] ?? '').trim() : '',
    reference: referenceKey ? String(normalized[referenceKey] ?? '').trim() : '',
    id_bling: idBlingKey ? String(normalized[idBlingKey] ?? '').trim() : '',
  };
}

function matchKey(store: string, reference: string): string {
  return `${store}::${reference}`;
}

// ---------- Paleta de cores ----------
const COLORS = {
  headerBlue: 'FF1A8CEB',
  headerRed: 'FFC0392B',
  lightRed: 'FFF5B7B1',
  headerGreen: 'FF1E8449',
  lightGreen: 'FFABEBC6',
  headerOrange: 'FFE67E22',
  lightOrange: 'FFFAD7A0',
  headerGray: 'FF4A4A4A',
  lightGray: 'FFEAEAEA',
  white: 'FFFFFFFF',
};

type Category = 'erro' | 'sucesso' | 'atencao' | 'neutro';

function getCategory(row: ResultRow): Category {
  const status = (row.status ?? '').trim();

  switch (status) {
    case 'Anúncio não validado':
      return 'neutro';
    case 'Sem composição':
      return 'erro';
    case 'Custo inválido':
      return 'atencao';
    case 'OK':
      return 'sucesso';
    default:
      return 'erro';
  }
}

function fill(color: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function formatBRL(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: 'Nenhuma aba encontrada no arquivo.' }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: RawRow[] = XLSX.utils.sheet_to_json(sheet);

    if (!rawRows.length) {
      return NextResponse.json({ error: 'Planilha vazia ou formato inválido.' }, { status: 400 });
    }

    const rows: InputRow[] = rawRows.map(mapRow);

    const invalid = rows.some((r) => !r.store || !r.reference);
    if (invalid) {
      return NextResponse.json(
        {
          error:
            'A planilha deve conter as colunas "Loja/Store" e "Referência/Reference" preenchidas em todas as linhas.',
        },
        { status: 400 }
      );
    }

    const idBlingMap = new Map<string, string>();
    for (const r of rows) {
      idBlingMap.set(matchKey(r.store, r.reference), r.id_bling);
    }

    const registros = rows.map((r) => ({
      store: r.store,
      reference: r.reference,
    }));

    const registrosComBling = rows.map((r) => ({
      store: r.store,
      reference: r.reference,
      id_bling: r.id_bling,
    }));

    // ---------- Chama as três RPCs em paralelo ----------
    const [mainResult, itemsResult, existenceResult] = await Promise.all([
      supabase.rpc('validate_cost_composition', { p_registros: registros }),
      supabase.rpc('validate_cost_composition_items', { p_registros: registros }),
      supabase.rpc('validate_ad_existence', { p_registros: registrosComBling }),
    ]);

    if (mainResult.error) {
      console.error('Erro RPC Supabase (main):', mainResult.error);
      return NextResponse.json(
        { error: 'Erro ao validar dados no banco.', details: mainResult.error.message },
        { status: 500 }
      );
    }

    if (itemsResult.error) {
      console.error('Erro RPC Supabase (items):', itemsResult.error);
      return NextResponse.json(
        { error: 'Erro ao buscar itens detalhados.', details: itemsResult.error.message },
        { status: 500 }
      );
    }

    if (existenceResult.error) {
      console.error('Erro RPC Supabase (existence):', existenceResult.error);
      return NextResponse.json(
        { error: 'Erro ao verificar existência dos anúncios.', details: existenceResult.error.message },
        { status: 500 }
      );
    }

    const result = (mainResult.data ?? []) as ResultRow[];
    const items = (itemsResult.data ?? []) as ItemRow[];
    const existence = (existenceResult.data ?? []) as ExistenceRow[];

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json(
        {
          error:
            'A validação não retornou nenhum resultado. Verifique se os dados enviados (loja/referência) existem no banco.',
        },
        { status: 400 }
      );
    }

    // ---------- Totais para a aba Resumo ----------
    const totalAnuncios = result.length;
    const totalOk = result.filter((r) => getCategory(r) === 'sucesso').length;
    const totalAtencao = result.filter((r) => getCategory(r) === 'atencao').length;
    const totalSemComposicao = result.filter((r) => r.status === 'Sem composição').length;
    const totalNaoValidado = result.filter((r) => r.status === 'Anúncio não validado').length;
    const totalItensProblema = items.length;
    const totalExistentes = existence.filter((e) => e.existe === 'Sim').length;
    const totalNaoExistentes = existence.filter((e) => e.existe === 'Não').length;

    // ---------- Workbook ----------
    const outWorkbook = new ExcelJS.Workbook();
    outWorkbook.creator = 'Validação de Composição';
    outWorkbook.created = new Date();
    // =====================================================
    // ABA 1: RESUMO
    // =====================================================
    const resumoSheet = outWorkbook.addWorksheet('Resumo');
    resumoSheet.columns = [
      { key: 'label', width: 40 },
      { key: 'value', width: 20 },
    ];

    const titleRow = resumoSheet.addRow(['Relatório de Validação de Anúncios e Composição', '']);
    resumoSheet.mergeCells(`A${titleRow.number}:B${titleRow.number}`);
    titleRow.font = { bold: true, size: 14, color: { argb: COLORS.white } };
    titleRow.getCell(1).fill = fill(COLORS.headerBlue);
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 28;

    const dataGeracaoRow = resumoSheet.addRow(['Data de geração', new Date().toLocaleString('pt-BR')]);
    dataGeracaoRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
    resumoSheet.addRow([]);

    const existenciaHeaderRow = resumoSheet.addRow(['Existência do Anúncio (via ID Bling)', '']);
    existenciaHeaderRow.font = { bold: true, italic: true };

    const existenciaData: [string, number, string][] = [
      ['✔ Anúncio encontrado no sistema', totalExistentes, COLORS.headerGreen],
      ['✖ Anúncio não encontrado no sistema', totalNaoExistentes, COLORS.headerRed],
    ];
    existenciaData.forEach(([label, value, color]) => {
      const row = resumoSheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, color: { argb: COLORS.white } };
      row.getCell(2).fill = fill(color);
      row.getCell(2).alignment = { horizontal: 'center' };
      row.height = 20;
    });

    resumoSheet.addRow([]);
    const composicaoHeaderRow = resumoSheet.addRow(['Composição de Custos', '']);
    composicaoHeaderRow.font = { bold: true, italic: true };

    const summaryData: [string, number, string][] = [
      ['Total de anúncios analisados', totalAnuncios, COLORS.headerBlue],
      ['✔ Composição OK', totalOk, COLORS.headerGreen],
      ['⚠ Custo inválido', totalAtencao, COLORS.headerOrange],
      ['✖ Sem composição cadastrada', totalSemComposicao, COLORS.headerRed],
      ['◻ Não validado (loja/referência não localizada)', totalNaoValidado, COLORS.headerGray],
      ['Total de itens com problema (detalhado)', totalItensProblema, COLORS.headerGray],
    ];

    summaryData.forEach(([label, value, color]) => {
      const row = resumoSheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, color: { argb: COLORS.white } };
      row.getCell(2).fill = fill(color);
      row.getCell(2).alignment = { horizontal: 'center' };
      row.height = 20;
    });

    resumoSheet.addRow([]);
    const legendaHeaderRow = resumoSheet.addRow(['Legenda de Status', '']);
    legendaHeaderRow.font = { bold: true, italic: true };

    const legendas: [string, string][] = [
      ['OK', 'Composição completa e custos válidos'],
      ['Custo inválido', 'Existem itens com custo zerado, não informado ou excluído'],
      ['Sem composição', 'Anúncio existe, mas não tem nenhum item cadastrado'],
      [
        'Anúncio não validado',
        'Não foi possível localizar loja/referência para validar a composição. Consulte a aba "Existência do Anúncio".',
      ],
    ];
    legendas.forEach(([status, desc]) => {
      const row = resumoSheet.addRow([status, desc]);
      row.getCell(2).alignment = { wrapText: true };
    });
    resumoSheet.getColumn(2).width = 60;

    // =====================================================
    // ABA 2: EXISTÊNCIA DO ANÚNCIO (via ID Bling)
    // =====================================================
    const existenceSheet = outWorkbook.addWorksheet('Existência do Anúncio');

    existenceSheet.columns = [
      { header: 'Loja', key: 'store', width: 15 },
      { header: 'ID Bling', key: 'id_bling', width: 14 },
      { header: 'Referência', key: 'reference', width: 20 },
      { header: 'Existe no sistema?', key: 'existe', width: 16 },
      { header: 'Ativo?', key: 'ativo', width: 10 },
      { header: 'Observação', key: 'observacao', width: 70 },
    ];

    const existenceHeaderRow = existenceSheet.getRow(1);
    existenceHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = fill(COLORS.headerBlue);
    });
    existenceHeaderRow.height = 22;

    existence.forEach((row) => {
      const isFound = row.existe === 'Sim';
      const strongColor = isFound ? COLORS.headerGreen : COLORS.headerRed;
      const lightColor = isFound ? COLORS.lightGreen : COLORS.lightRed;

      const excelRow = existenceSheet.addRow({
        store: row.store,
        id_bling: row.id_bling,
        reference: row.reference,
        existe: row.existe,
        ativo: row.ativo ?? '-',
        observacao: row.observacao,
      });

      excelRow.eachCell((cell, colNumber) => {
        if (colNumber === 4) {
          cell.fill = fill(strongColor);
          cell.font = { bold: true, color: { argb: COLORS.white } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 6) {
          cell.fill = fill(lightColor);
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else {
          cell.fill = fill(lightColor);
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 5 ? 'center' : 'left' };
        }
      });
    });

    existenceSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: existenceSheet.columns.length },
    };
    existenceSheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

    // =====================================================
    // ABA 3: VALIDAÇÃO (composição de custos)
    // =====================================================
    const outSheet = outWorkbook.addWorksheet('Validação');

    outSheet.columns = [
      { header: 'Loja', key: 'store', width: 15 },
      { header: 'ID Bling', key: 'id_bling', width: 14 },
      { header: 'Referência', key: 'reference', width: 20 },
      { header: 'Já está ativo?', key: 'ja_esta_ativo', width: 14 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Total de itens', key: 'total_itens', width: 12 },
      { header: 'Itens sem custo', key: 'itens_sem_custo', width: 14 },
      { header: 'Observação', key: 'observacao', width: 100 },
    ];

    const headerRow = outSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = fill(COLORS.headerBlue);
    });
    headerRow.height = 22;

    result.forEach((row) => {
      const category = getCategory(row);

      const strongColor =
        category === 'erro'
          ? COLORS.headerRed
          : category === 'atencao'
          ? COLORS.headerOrange
          : category === 'neutro'
          ? COLORS.headerGray
          : COLORS.headerGreen;

      const lightColor =
        category === 'erro'
          ? COLORS.lightRed
          : category === 'atencao'
          ? COLORS.lightOrange
          : category === 'neutro'
          ? COLORS.lightGray
          : COLORS.lightGreen;

      const idBling = idBlingMap.get(matchKey(row.store, row.reference)) ?? '';

      const excelRow = outSheet.addRow({
        store: row.store,
        id_bling: idBling,
        reference: row.reference,
        ja_esta_ativo: row.ja_esta_ativo,
        status: row.status,
        total_itens: row.total_itens,
        itens_sem_custo: row.itens_sem_custo,
        observacao: row.observacao,
      });

      const linhasObservacao = (row.observacao ?? '').split('\n').length;
      excelRow.height = Math.max(20, linhasObservacao * 15);

      excelRow.eachCell((cell, colNumber) => {
        if (colNumber === 5) {
          cell.fill = fill(strongColor);
          cell.font = { bold: true, color: { argb: COLORS.white } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 8) {
          cell.fill = fill(COLORS.lightOrange);
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else if (colNumber === 1 || colNumber === 2 || colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.fill = fill(lightColor);
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    outSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: outSheet.columns.length },
    };

    outSheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

    // =====================================================
    // ABA 4: ITENS COM PROBLEMA (detalhado)
    // =====================================================
    const itemsSheet = outWorkbook.addWorksheet('Itens com Problema');

    itemsSheet.columns = [
      { header: 'Loja', key: 'store', width: 15 },
      { header: 'Referência', key: 'reference', width: 20 },
      { header: 'Código do Item', key: 'item_code', width: 18 },
      { header: 'Produto', key: 'item_product', width: 35 },
      { header: 'Quantidade na Composição', key: 'quantidade', width: 20 },
      { header: 'Motivo', key: 'motivo', width: 22 },
      { header: 'Custo Atual', key: 'custo_atual', width: 15 },
    ];

    const itemsHeaderRow = itemsSheet.getRow(1);
    itemsHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = fill(COLORS.headerGray);
    });
    itemsHeaderRow.height = 22;

    if (items.length === 0) {
      const emptyRow = itemsSheet.addRow(['Nenhum item com problema encontrado 🎉', '', '', '', '', '', '']);
      itemsSheet.mergeCells(`A${emptyRow.number}:G${emptyRow.number}`);
      emptyRow.getCell(1).font = { italic: true, color: { argb: COLORS.headerGreen } };
      emptyRow.getCell(1).alignment = { horizontal: 'center' };
    } else {
      items.forEach((item) => {
        const motivoColor =
          item.motivo === 'Sem custo vinculado' || item.motivo === 'Custo excluído'
            ? COLORS.lightRed
            : COLORS.lightOrange;

        const excelRow = itemsSheet.addRow({
          store: item.store,
          reference: item.reference,
          item_code: item.item_code,
          item_product: item.item_product,
          quantidade: item.quantidade,
          motivo: item.motivo,
          custo_atual: formatBRL(item.custo_atual),
        });

        excelRow.eachCell((cell, colNumber) => {
          if (colNumber === 6) {
            cell.fill = fill(motivoColor);
            cell.font = { bold: true };
          }
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 4 ? 'left' : 'center' };
        });
      });

      itemsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: itemsSheet.columns.length },
      };
    }

    itemsSheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

    // ---------- Gera buffer ----------
    const outBuffer = await outWorkbook.xlsx.writeBuffer();

    const now = new Date();
    const dataHora = now
      .toLocaleString('pt-BR', { hour12: false })
      .replace(/\//g, '-')
      .replace(',', '')
      .replace(/:/g, '-');

    const nomeArquivo = `VALIDAÇÃO - COMPOSIÇÃO - ${dataHora}.xlsx`;

    return new NextResponse(outBuffer as Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nomeArquivo)}"`,
      },
    });
  } catch (err) {
    console.error('Erro na validação de composição:', err);
    return NextResponse.json({ error: 'Erro interno ao processar a planilha.' }, { status: 500 });
  }
}
