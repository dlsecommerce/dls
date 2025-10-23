"use client";

import React from "react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";
import TopBar from "@/components/announce/AnnounceTable/TopBar";
import ConfirmImportModal from "@/components/announce/AnnounceTable/ConfirmImportModal";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { useTrayImportExport } from "@/components/marketplaces/hooks/useTrayImportExport";
import { supabase } from "@/integrations/supabase/client";

export default function PricingTable() {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const impExp = useTrayImportExport(rows);
  const { calculo, setCalculo } = usePrecificacao();

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 🔹 1. Busca anúncios
      const { data: anuncios, error: err1 } = await supabase
        .from("anuncios_all")
        .select("id, marca, id_tray, referencia");

      // 🔹 2. Busca custos
      const { data: custos, error: err2 } = await supabase
        .from("custos")
        .select("id_produto, custo_total");

      if (err1 || err2) {
        console.error("Erro ao carregar dados:", err1 || err2);
        setLoading(false);
        return;
      }

      // 🔹 3. Merge (anúncio + custo)
      const merged = (anuncios || []).map((a) => {
        const custoItem = (custos || []).find((c) => c.id_produto === a.id);
        return {
          ...a,
          custo_total: custoItem?.custo_total ?? 0,
        };
      });

      setRows(merged);
      setLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          {/* 🔝 Barra superior (reutilizada) */}
          <TopBar
            search={""}
            setSearch={() => {}}
            allBrands={[]}
            allLojas={[]}
            allCategorias={[]}
            selectedBrands={[]}
            selectedLoja={null}
            selectedCategoria={null}
            setSelectedBrands={() => {}}
            setSelectedLoja={() => {}}
            setSelectedCategoria={() => {}}
            filterOpen={false}
            setFilterOpen={() => {}}
            fileInputRef={impExp.fileInputRef}
            onFileSelect={impExp.handleFileSelect}
            onExport={() => impExp.handleExport(rows)}
            selectedCount={0}
            onDeleteSelected={() => {}}
            onClearSelection={() => {}}
            onMassEditOpen={() => {}}
            onNew={() => {}}
          />

          {/* 📋 Tabela */}
          <Table>
            <TableHeader>
              <tr className="text-neutral-400 text-sm">
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">ID Tray</th>
                <th className="px-3 py-2 text-left">Marca</th>
                <th className="px-3 py-2 text-left">Referência</th>
                <th className="px-3 py-2 text-left">Desconto (%)</th>
                <th className="px-3 py-2 text-left">Frete (R$)</th>
                <th className="px-3 py-2 text-left">Comissão (%)</th>
                <th className="px-3 py-2 text-left">Imposto (%)</th>
                <th className="px-3 py-2 text-left">Marketing (%)</th>
                <th className="px-3 py-2 text-left">Custo (R$)</th>
                <th className="px-3 py-2 text-left">Preço de Venda (R$)</th>
              </tr>
            </TableHeader>

            <TableBody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center text-neutral-500 py-6">
                    Carregando dados...
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const custo = Number(row.custo_total ?? 0);

                  // 🔹 cálculo baseado no hook usePrecificacao
                  const precoVendaCalc =
                    custo > 0
                      ? (custo + Number(calculo.frete || 0) + 2.5) /
                        (1 -
                          (Number(calculo.imposto || 0) / 100 +
                            Number(calculo.margem || 0) / 100 +
                            Number(calculo.comissao || 0) / 100 +
                            Number(calculo.marketing || 0) / 100))
                      : 0;

                  return (
                    <tr key={row.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-3 py-2 text-white">{row.marca}</td>
                      <td className="px-3 py-2 text-white">{row.id}</td>
                      <td className="px-3 py-2 text-white">{row.id_tray}</td>
                      <td className="px-3 py-2 text-white">{row.referencia}</td>

                      {/* Campos editáveis */}
                      {["desconto", "frete", "comissao", "imposto", "marketing"].map((campo) => (
                        <td key={campo} className="px-3 py-2 text-white">
                          <input
                            type="number"
                            value={(calculo as any)[campo] || ""}
                            onChange={(e) =>
                              setCalculo((prev) => ({
                                ...prev,
                                [campo]: e.target.value,
                              }))
                            }
                            className="w-20 bg-transparent border border-white/10 rounded-md px-2 text-white text-sm"
                          />
                        </td>
                      ))}

                      {/* Custo */}
                      <td className="px-3 py-2 text-white">
                        {custo.toFixed(2)}
                      </td>

                      {/* Preço de venda */}
                      <td className="px-3 py-2 text-[#4ade80] font-semibold">
                        {precoVendaCalc.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </GlassmorphicCard>

        <TableControls
          currentPage={1}
          totalPages={1}
          itemsPerPage={rows.length}
          totalItems={rows.length}
          onPageChange={() => {}}
          onItemsPerPageChange={() => {}}
          selectedCount={0}
        />
      </div>

      <ConfirmImportModal
        open={impExp.openConfirmImport}
        onOpenChange={impExp.setOpenConfirmImport}
        count={impExp.importCount}
        onConfirm={impExp.confirmImport}
        loading={impExp.importing}
        preview={impExp.previewRows}
        warnings={impExp.warnings}
      />
    </div>
  );
}
