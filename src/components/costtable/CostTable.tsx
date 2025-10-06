"use client";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowUpDown,
  Download,
  Edit as EditIcon,
  Search,
  Trash2 as TrashIcon,
  Upload,
} from "lucide-react";

import { TableControls } from "@/components/costtable/TableControls";
import FilterBrandsPopover from "@/components/costtable/FilterBrandsPopover";
import ModalNewCost, {
  Custo as CustoType,
} from "@/components/costtable/ModalNewCost";
import MassEditionModal from "@/components/costtable/MassEditionModal";

import { exportFilteredToXlsx } from "@/components/costtable/helpers/exportToXlsx";
import { importFromXlsxOrCsv } from "@/components/costtable/helpers/importFromXlsx";

type Custo = CustoType;

export default function CostTable() {
  const [rows, setRows] = useState<Custo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [search, setSearch] = useState("");
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [openNew, setOpenNew] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<Custo>({
    ["Código"]: "",
    ["Marca"]: "",
    ["Custo Atual"]: "",
    ["Custo Antigo"]: "",
    ["NCM"]: "",
  });
  const [openMass, setOpenMass] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* === carregar todas as marcas === */
  const loadAllBrands = async () => {
    const { count } = await supabase
      .from("custos")
      .select("*", { count: "exact", head: true });

    const total = count || 0;
    const pageSize = 2000;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const setBrands = new Set<string>();

    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("custos")
        .select("Marca")
        .range(from, to);
      if (error) break;
      (data || []).forEach((r: any) => {
        if (r?.Marca) setBrands.add(r.Marca);
      });
    }

    setAllBrands(Array.from(setBrands).sort((a, b) => a.localeCompare(b)));
  };

  /* === construir query === */
  const buildQuery = (countOnly = false) => {
    let q = supabase
      .from("custos")
      .select(countOnly ? "*" : "*", { count: "exact", head: countOnly });
    if (search.trim() !== "")
      q = q.or(
        `Código.ilike.%${search}%,Marca.ilike.%${search}%,NCM.ilike.%${search}%`
      );
    if (selectedBrands.length > 0) q = q.in("Marca", selectedBrands);
    if (sortColumn)
      q = q.order(sortColumn, { ascending: sortDirection === "asc" });
    return q;
  };

  /* === carregar dados === */
  const loadData = async (page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { count } = await buildQuery(true);
    setTotalItems(count || 0);

    const { data, error } = await buildQuery(false).range(from, to);
    if (!error && data) setRows(data as Custo[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllBrands();
  }, []);
  useEffect(() => {
    loadData(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, sortColumn, sortDirection]);
  useEffect(() => {
    setCurrentPage(1);
    loadData(1, itemsPerPage);
  }, [search, selectedBrands]);

  const handleSort = (col: string) => {
    if (sortColumn === col)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  /* === exportar RELATÓRIO === */
  const fetchAllFiltered = async (): Promise<Custo[]> => {
    const { count } = await buildQuery(true);
    const total = count || 0;
    const pageSize = 1000;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    let results: Custo[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await buildQuery(false).range(from, to);
      if (error) break;
      results = results.concat((data as Custo[]) || []);
    }
    return results;
  };

  const handleExport = async () => {
    const rows = await fetchAllFiltered();
    if (!rows || rows.length === 0) {
      alert("Nenhum dado encontrado para exportar.");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR").replaceAll("/", "-");
    const timeStr = `${now.getHours()}h${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}m`;

    let filename = "RELATÓRIO";
    if (selectedBrands.length === 1) {
      filename += ` ${selectedBrands[0].toUpperCase()}`;
    } else if (selectedBrands.length > 1) {
      const abbreviations = selectedBrands
        .map((m) => m.trim().substring(0, 3).toUpperCase())
        .slice(0, 3)
        .join(" ");
      filename += ` ${abbreviations}`;
      if (selectedBrands.length > 3) filename += " ETC";
    }

    filename += ` - ${dateStr} ${timeStr}.xlsx`;

    exportFilteredToXlsx(rows, filename);
  };

  /* === importar === */
  const handleImport = async (file: File) => {
    const imported = await importFromXlsxOrCsv(file);
    if (imported.length === 0) {
      alert("Nenhum registro válido encontrado no arquivo.");
      return;
    }
    const { error } = await supabase
      .from("custos")
      .upsert(imported, { onConflict: "Código" });
    if (error) {
      console.error(error);
      alert("Erro ao importar.");
      return;
    }
    alert(`Importação concluída: ${imported.length} registros processados.`);
    loadData(currentPage, itemsPerPage);
    loadAllBrands();
  };

  /* === crud === */
  const openCreate = () => {
    setMode("create");
    setForm({
      ["Código"]: "",
      ["Marca"]: "",
      ["Custo Atual"]: "",
      ["Custo Antigo"]: "",
      ["NCM"]: "",
    });
    setOpenNew(true);
  };

  const openEdit = (row: Custo) => {
    setMode("edit");
    setForm({
      ["Código"]: row["Código"] || "",
      ["Marca"]: row["Marca"] || "",
      ["Custo Atual"]: row["Custo Atual"] || "",
      ["Custo Antigo"]: row["Custo Antigo"] || "",
      ["NCM"]: row["NCM"] || "",
    });
    setOpenNew(true);
  };

  const saveForm = async () => {
    if (!form["Código"]) {
      alert("Código é obrigatório.");
      return;
    }
    const payload: Custo = {
      ["Código"]: form["Código"],
      ["Marca"]: form["Marca"],
      ["Custo Atual"]: Number(form["Custo Atual"]) || 0,
      ["Custo Antigo"]: Number(form["Custo Antigo"]) || 0,
      ["NCM"]: form["NCM"],
    };
    let error;
    if (mode === "create")
      ({ error } = await supabase.from("custos").insert([payload]));
    else
      ({ error } = await supabase
        .from("custos")
        .update(payload)
        .eq("Código", form["Código"]));
    if (error) {
      console.error(error);
      alert("Erro ao salvar.");
    } else {
      setOpenNew(false);
      loadData(currentPage, itemsPerPage);
      loadAllBrands();
    }
  };

  const deleteRow = async (row: Custo) => {
    if (!confirm(`Excluir o item ${row["Código"]}?`)) return;
    const { error } = await supabase
      .from("custos")
      .delete()
      .eq("Código", row["Código"]);
    if (error) alert("Erro ao excluir.");
    else {
      loadData(currentPage, itemsPerPage);
      loadAllBrands();
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por código, marca ou NCM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <FilterBrandsPopover
                allBrands={allBrands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                open={filterOpen}
                onOpenChange={setFilterOpen}
              />

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.currentTarget.value = "";
                }}
              />

              <Button
                variant="outline"
                className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" /> Importar
              </Button>

              <Button
                variant="outline"
                className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>

              <Button
                className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
                onClick={() => setOpenMass(true)}
              >
                Edição em Massa
              </Button>

              <Button
                className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
                onClick={openCreate}
              >
                + Novo Custo
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-700">
                  {["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"].map(
                    (col) => (
                      <TableHead
                        key={col}
                        className="text-gray-400 font-semibold cursor-pointer"
                        onClick={() => handleSort(col)}
                      >
                        <div className="flex items-center gap-1">
                          {col} <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </div>
                      </TableHead>
                    )
                  )}
                  <TableHead className="w-[120px] text-gray-400 font-semibold">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-400 py-8"
                    >
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-400 py-8"
                    >
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c, i) => (
                    <tr
                      key={`${c["Código"]}-${i}`}
                      className="border-b border-neutral-700 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="text-white">{c["Código"]}</TableCell>
                      <TableCell>
                        <Badge className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white">
                          {c["Marca"]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        R$ {Number(c["Custo Atual"] || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        R$ {Number(c["Custo Antigo"] || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {c["NCM"]}
                      </TableCell>
                      <TableCell className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:text-[#1a8ceb] hover:scale-105 transition-all cursor-pointer"
                          onClick={() => openEdit(c)}
                          title="Editar"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:text-[#ef4444] hover:scale-105 transition-all cursor-pointer"
                          onClick={() => deleteRow(c)}
                          title="Excluir"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </GlassmorphicCard>

        <div className="mt-2">
          <TableControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={(p) => setCurrentPage(p)}
            onItemsPerPageChange={(v) => {
              setItemsPerPage(v);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <ModalNewCost
        open={openNew}
        onOpenChange={setOpenNew}
        mode={mode}
        form={form}
        setForm={setForm}
        onSave={saveForm}
      />

      <MassEditionModal
        open={openMass}
        onOpenChange={setOpenMass}
        onExportModeloAlteracao={handleExport}
      />
    </div>
  );
}
