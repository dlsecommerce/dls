// app/api/planilha/validate-ads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'newsystem' } } // 👈 aponta o client para o schema correto
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
  observacao: string; // 👈 novo
}

type RawRow = Record<string, any>;

function normalizeKey(key: string) {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
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

    const outWorkbook = XLSX.utils.book_new();
    const outSheet = XLSX.utils.json_to_sheet(result, {
      header: [
        'store',
        'reference',
        'ja_esta_ativo',
        'status',
        'total_itens',
        'itens_sem_custo',
        'observacao', // 👈 novo
      ],
      skipHeader: true,
    });

    XLSX.utils.sheet_add_aoa(
      outSheet,
      [
        [
          'Loja',
          'Referência',
          'Já está ativo?',
          'Status',
          'Total de itens',
          'Itens sem custo',
          'Observação', // 👈 novo
        ],
      ],
      { origin: 'A1' }
    );

    // Ajusta a largura das colunas para melhor leitura (especialmente a observação)
    outSheet['!cols'] = [
      { wch: 15 }, // Loja
      { wch: 20 }, // Referência
      { wch: 14 }, // Já está ativo?
      { wch: 18 }, // Status
      { wch: 12 }, // Total de itens
      { wch: 14 }, // Itens sem custo
      { wch: 60 }, // Observação
    ];

    XLSX.utils.book_append_sheet(outWorkbook, outSheet, 'Validação');
    const outBuffer = XLSX.write(outWorkbook, { type: 'buffer', bookType: 'xlsx' });

    const dataHora = new Date().toLocaleString('pt-BR').replace(/[/,:\s]/g, '-');
    const nomeArquivo = `validacao_composicao_${dataHora}.xlsx`;

    return new NextResponse(outBuffer, {
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
