import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: InputRow[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return NextResponse.json({ error: 'Planilha vazia ou formato inválido.' }, { status: 400 });
    }

    const invalid = rows.some(r => !r.store || !r.reference);
    if (invalid) {
      return NextResponse.json(
        { error: 'Planilha deve conter as colunas "store" e "reference" preenchidas em todas as linhas.' },
        { status: 400 }
      );
    }

    const registros = rows.map(r => ({
      store: String(r.store).trim(),
      reference: String(r.reference).trim(),
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

    const result = data as ResultRow[];

    const outWorkbook = XLSX.utils.book_new();
    const outSheet = XLSX.utils.json_to_sheet(result, {
      header: ['store', 'reference', 'ja_esta_ativo', 'status', 'total_itens', 'itens_sem_custo'],
    });

    XLSX.utils.sheet_add_aoa(
      outSheet,
      [['Loja', 'Referência', 'Já está ativo?', 'Status', 'Total de itens', 'Itens sem custo']],
      { origin: 'A1' }
    );

    XLSX.utils.book_append_sheet(outWorkbook, outSheet, 'Validação');
    const outBuffer = XLSX.write(outWorkbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="validacao_composicao.xlsx"',
      },
    });
  } catch (err) {
    console.error('Erro na validação de composição:', err);
    return NextResponse.json({ error: 'Erro interno ao processar a planilha.' }, { status: 500 });
  }
}
