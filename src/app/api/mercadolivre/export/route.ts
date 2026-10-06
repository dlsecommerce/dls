import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx-js-style";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

type CustoRow = {
  item_id: string;
  titulo: string | null;
  custo_vendedor: string | number | null;
};

const HEADERS = ["ID", "Produto", "Frete"];
const WIDTHS = [20, 60, 18];
const MONEY_COL = 2;
const MONEY_FORMAT = '"R$" #,##0.00';

const toNum = (v: unknown) =>
  v === null || v === undefined || v === "" ? null : Number(v);

function buildXlsx(rows: CustoRow[]): Buffer {
  const data = rows.map((r) => [
    r.item_id,
    r.titulo ?? "",
    toNum(r.custo_vendedor),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1A8CEB" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  HEADERS.forEach((_, c) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    (ws as any)[ref] = (ws as any)[ref] || {};
    (ws as any)[ref].s = headerStyle;
  });

  for (let r = 1; r <= data.length; r++) {
    const cell = (ws as any)[XLSX.utils.encode_cell({ r, c: MONEY_COL })];
    if (cell && cell.t === "n") cell.z = MONEY_FORMAT;
  }

  (ws as any)["!cols"] = WIDTHS.map((wch) => ({ wch }));
  (ws as any)["!autofilter"] = { ref: `A1:C${data.length + 1}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Frete vendedor");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
}

function buildFileName(conta: string): string {
  const now = new Date();
  const date = now
    .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    .replace(/\//g, "-");
  const time = now
    .toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })
    .replace(/:/g, "-");
  return `FRETES ML - ${conta.toUpperCase()} - ${date} ${time}.xlsx`;
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const [type, token] = (req.headers.get("authorization") ?? "").split(" ");
  if (type?.toLowerCase() !== "bearer" || !token?.trim()) return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token.trim());
  return !error && !!data.user;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada. Entre novamente no sistema." },
      { status: 401 }
    );
  }

  const conta = (req.nextUrl.searchParams.get("conta") ?? "sobaquetas").toLowerCase();

  try {
    const { rows } = await pool.query(
      `with f as (
         select item_id,
                max(titulo) as titulo,
                max(nullif(custo_vendedor, 0)) as custo
           from newsystem.ml_fretes
          where conta = $1
          group by item_id
       ),
       c as (
         select item_id, titulo, custo
           from newsystem.ml_custo_vendedor_item
          where conta = $1 and custo > 0
       )
       select item_id,
              coalesce(f.titulo, c.titulo) as titulo,
              coalesce(f.custo, c.custo)   as custo_vendedor
         from f
         full join c using (item_id)
        order by 2 nulls last, 1`,
      [conta]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Nenhum frete encontrado. Rode a sincronização antes de exportar." },
        { status: 404 }
      );
    }

    const buffer = buildXlsx(rows as CustoRow[]);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildFileName(conta)}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro ao exportar." }, { status: 500 });
  }
}
