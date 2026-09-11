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

function mapRow(raw: RawRow): InputRow {
  const normalized: Record<string, any> = {};
  for (const key of Object.keys(raw)) {
    normalized[normalizeKey(key)] = raw[key];
  }
  const storeKey = STORE_ALIASES.find((k) => normalized[k] !== undefined);
  const referenceKey = REFERENCE_ALIASES.find((k) => normalized[k] !== undefined);
  return {
    store: storeKey ? String(normalized[storeKey] ?? '').trim() : '',
    reference: referenceKey ? String(normalized[referenceKey] ?? '').trim() : '',
  };
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
  white: 'FFFFFFFF',
};

type Category = 'erro' | 'sucesso' | 'atencao';

function getCategory(row: ResultRow): Category {
  const status = (row.status ?? '').toString().toLowerCase();
  if (status.includes('erro')) return 'erro';
  if (status.includes('atenç') || status.includes('atenc')) return 'atencao';
  return 'sucesso';
}

function fill(color: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
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

    const registros = rows.map((r) => ({
      store: r.store,
      reference: r.reference,
    }));

    const { data, error } = await supabase.rpc('validate_cost_composition', {
      p_registros: registros,
    });

    if (error) {
      console.error('Erro RPC Supabase:', error);
      return NextResponse.json(
        { error: 'Erro ao validar dados no banco.', details: error.message },
        { status: 500 }
      );
    }

    const result = (data ?? []) as ResultRow[];

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json(
        {
          error:
            'A validação não retornou nenhum resultado. Verifique se os dados enviados (loja/referência) existem no banco.',
        },
        { status: 400 }
      );
    }

    // ---------- Montagem do Excel com exceljs ----------
    const outWorkbook = new ExcelJS.Workbook();
    const outSheet = outWorkbook.addWorksheet('Validação');

    const headers = [
      'Loja',
      'Referência',
      'Já está ativo?',
      'Status',
      'Total de itens',
      'Itens sem custo',
      'Observação',
    ];

    outSheet.columns = [
      { header: headers[0], key: 'store', width: 15 },
      { header: headers[1], key: 'reference', width: 20 },
      { header: headers[2], key: 'ja_esta_ativo', width: 14 },
      { header: headers[3], key: 'status', width: 18 },
      { header: headers[4], key: 'total_itens', width: 12 },
      { header: headers[5], key: 'itens_sem_custo', width: 14 },
      { header: headers[6], key: 'observacao', width: 60 },
    ];

    // Estilo do cabeçalho
    const headerRow = outSheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: COLORS.white } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (colNumber === 1 || colNumber === 2) {
        // Loja / Referência -> sempre azul
        cell.fill = fill(COLORS.headerBlue);
      } else if (colNumber === 7) {
        // Observação -> sempre laranja
        cell.fill = fill(COLORS.headerOrange);
      } else {
        // Demais colunas do cabeçalho -> cor neutra padrão
        cell.fill = fill(COLORS.headerBlue);
      }
    });

    // Adiciona as linhas de dados
    result.forEach((row) => {
      const category = getCategory(row);

      const strongColor =
        category === 'erro'
          ? COLORS.headerRed
          : category === 'atencao'
          ? COLORS.headerOrange
          : COLORS.headerGreen;

      const lightColor =
        category === 'erro'
          ? COLORS.lightRed
          : category === 'atencao'
          ? COLORS.lightOrange
          : COLORS.lightGreen;

      const excelRow = outSheet.addRow({
        store: row.store,
        reference: row.reference,
        ja_esta_ativo: row.ja_esta_ativo,
        status: row.status,
        total_itens: row.total_itens,
        itens_sem_custo: row.itens_sem_custo,
        observacao: row.observacao,
      });

      excelRow.eachCell((cell, colNumber) => {
        if (colNumber === 4) {
          // Coluna "Status" -> cor forte (destaque da categoria)
          cell.fill = fill(strongColor);
          cell.font = { bold: true, color: { argb: COLORS.white } };
        } else if (colNumber === 7) {
          // Coluna "Observação" -> sempre laranja claro
          cell.fill = fill(COLORS.lightOrange);
        } else if (colNumber === 1 || colNumber === 2) {
          // Loja / Referência -> sem preenchimento (mantém identidade da coluna)
        } else {
          // Demais colunas -> cor clara conforme categoria da linha
          cell.fill = fill(lightColor);
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    });

    // Congela o cabeçalho ao rolar
    outSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const outBuffer = await outWorkbook.xlsx.writeBuffer();

    // ---------- Nome do arquivo ----------
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
