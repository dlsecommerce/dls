// app/api/composicao/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ImportRow = {
  Loja?: string;
  Referência?: string;
  "Código do Item"?: string | number;
  Quantidade?: string | number;
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<ImportRow>(sheet);

  const supabase = await createSupabaseServerClient();

  const errors: { linha: number; motivo: string }[] = [];
  const skipped: number[] = [];
  let processed = 0;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const excelLine = i + 2; // +1 header, +1 índice base 1

    const store = String(row["Loja"] ?? "").trim();
    const reference = String(row["Referência"] ?? "").trim();
    const code = String(row["Código do Item"] ?? "").trim();
    const amountRaw = row["Quantidade"];
    const amount = Number(amountRaw);

    // Pula linha vazia / sem item preenchido (linhas do modelo não completadas)
    if (!code || !amountRaw) {
      skipped.push(excelLine);
      continue;
    }

    if (!store || !reference) {
      errors.push({ linha: excelLine, motivo: "Loja ou Referência ausente." });
      continue;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ linha: excelLine, motivo: `Quantidade inválida: "${amountRaw}"` });
      continue;
    }

    // 1. Localiza o anúncio
    const { data: announce, error: announceErr } = await supabase
      .schema("newsystem")
      .from("announce")
      .select("id")
      .eq("store", store)
      .eq("reference", reference)
      .is("deleted_at", null)
      .maybeSingle();

    if (announceErr || !announce) {
      errors.push({ linha: excelLine, motivo: `Anúncio não encontrado (${store} / ${reference}).` });
      continue;
    }

    // 2. Localiza o item de custo
    const { data: cost, error: costErr } = await supabase
      .schema("newsystem")
      .from("costs")
      .select("id")
      .eq("code", code)
      .is("deleted_at", null)
      .maybeSingle();

    if (costErr || !cost) {
      errors.push({ linha: excelLine, motivo: `Código de item não encontrado: "${code}".` });
      continue;
    }

    // 3. Verifica se já existe composição ativa (announce_id + cost_id)
    const { data: existing } = await supabase
      .schema("newsystem")
      .from("composition")
      .select("id")
      .eq("announce_id", announce.id)
      .eq("cost_id", cost.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      // UPDATE - upsert incremental: atualiza a quantidade
      const { error: updateErr } = await supabase
        .schema("newsystem")
        .from("composition")
        .update({ amount })
        .eq("id", existing.id);

      if (updateErr) {
        errors.push({ linha: excelLine, motivo: `Erro ao atualizar: ${updateErr.message}` });
        continue;
      }
    } else {
      // INSERT
      const { error: insertErr } = await supabase
        .schema("newsystem")
        .from("composition")
        .insert({ announce_id: announce.id, cost_id: cost.id, amount });

      if (insertErr) {
        errors.push({ linha: excelLine, motivo: `Erro ao inserir: ${insertErr.message}` });
        continue;
      }
    }

    processed++;
  }

  return NextResponse.json({
    success: errors.length === 0,
    processed,
    skipped: skipped.length,
    errors,
  });
}
