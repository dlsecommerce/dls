"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedMetricCard from "@/components/dashboard/AnimatedMetricCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helpers CSV
const toCSV = (rows: Record<string, any>[], headers: string[]) => {
  const esc = (v: any) => {
    const s = v ?? "";
    const str = typeof s === "string" ? s : String(s);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const head = headers.join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return [head, body].join("\n");
};

const downloadCSV = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const parseCSV = async (file: File): Promise<Record<string, string>[]> => {
  const text = await file.text();
  const [firstLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = firstLine.split(",").map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = values[idx]?.trim() ?? ""));
    return obj;
  });
};

// Paginação
function TableControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
      <div className="text-sm text-gray-400">
        Mostrando <span className="text-white">{startItem}</span> a{" "}
        <span className="text-white">{endItem}</span> de{" "}
        <span className="text-white">{totalItems}</span> produtos
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-400">Linhas por página:</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(v) => onItemsPerPageChange(Number(v))}
          >
            <SelectTrigger className="w-[70px] h-8 bg-[#0f0f0f] border border-white/10 text-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f0f] border-white/10 text-gray-300">
              {[5, 10, 20, 50].map((v) => (
                <SelectItem key={v} value={v.toString()}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-300 px-2">
            {currentPage} / {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TabelaCustos() {
  const [custos, setCustos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [marcaFiltro, setMarcaFiltro] = useState<string | null>(null);
  const [openNovo, setOpenNovo] = useState(false);
  const [novo, setNovo] = useState({
    codigo: "",
    marca: "",
    custo_atual: "",
    custo_antigo: "",
    ncm: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadCustos();
  }, []);

  const loadCustos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custos")
      .select('"Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"')
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setCustos(data || []);
    setLoading(false);
  };

  const handleSalvarNovo = async () => {
    const { error } = await supabase.from("custos").insert([
      {
        "Código": novo.codigo,
        "Marca": novo.marca,
        "Custo Atual": novo.custo_atual,
        "Custo Antigo": novo.custo_antigo,
        "NCM": novo.ncm,
      },
    ]);
    if (error) console.error(error);
    setOpenNovo(false);
    setNovo({ codigo: "", marca: "", custo_atual: "", custo_antigo: "", ncm: "" });
    loadCustos();
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseCSV(file);
    const formatted = rows.map((r) => ({
      "Código": r["Código"],
      "Marca": r["Marca"],
      "Custo Atual": r["Custo Atual"],
      "Custo Antigo": r["Custo Antigo"],
      "NCM": r["NCM"],
    }));
    const { error } = await supabase.from("custos").insert(formatted);
    if (error) console.error(error);
    loadCustos();
  };

  const headers = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];
  const custosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return custos.filter((c) => {
      const byBusca =
        c["Código"]?.toLowerCase().includes(termo) ||
        c["Marca"]?.toLowerCase().includes(termo) ||
        c["NCM"]?.toLowerCase().includes(termo);
      const byMarca = marcaFiltro ? c["Marca"] === marcaFiltro : true;
      return byBusca && byMarca;
    });
  }, [custos, busca, marcaFiltro]);

  const totalCustos = custos.reduce(
    (sum, c) => sum + (Number(c["Custo Atual"]) || 0),
    0
  );
  const mediaVariacao =
    custos.reduce(
      (sum, c) =>
        sum +
        ((Number(c["Custo Atual"]) - Number(c["Custo Antigo"])) /
          (Number(c["Custo Antigo"]) || 1)) *
          100,
      0
    ) / (custos.length || 1);

  const indexOfLast = currentPage * itemsPerPage;
  const currentItems = custosFiltrados.slice(
    indexOfLast - itemsPerPage,
    indexOfLast
  );
  const totalPages = Math.ceil(custosFiltrados.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <AnimatedMetricCard
            title="Total de Custos"
            value={`R$ ${totalCustos.toFixed(2)}`}
            subtitle={`${custos.length} itens`}
            icon={DollarSign}
            color="#f59e0b"
          />
          <AnimatedMetricCard
            title="Variação Média"
            value={`${mediaVariacao.toFixed(1)}%`}
            subtitle="Comparado ao anterior"
            icon={mediaVariacao >= 0 ? TrendingUp : TrendingDown}
            color={mediaVariacao >= 0 ? "#10b981" : "#ef4444"}
          />
          <AnimatedMetricCard
            title="Custo Médio"
            value={`R$ ${(totalCustos / (custos.length || 1)).toFixed(2)}`}
            subtitle="Por item"
            icon={DollarSign}
            color="#8b5cf6"
          />
        </div>

        <GlassmorphicCard>
          {/* Barra de ações */}
          <div className="p-6 border-b border-white/10 flex flex-wrap gap-3 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-12 bg-white/5 border-white/10 text-white h-12 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="text-white rounded-xl">
                    <Filter className="w-4 h-4 mr-2" />{" "}
                    {marcaFiltro ? `Marca: ${marcaFiltro}` : "Filtros"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-[#0f0f0f] border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMarcaFiltro(null)}
                    className="border-white/10 text-gray-300 hover:text-white mb-2"
                  >
                    Limpar filtro
                  </Button>
                  {[...new Set(custos.map((c) => c["Marca"]))].map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant="ghost"
                      onClick={() => setMarcaFiltro(m)}
                      className="w-full justify-start rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
                    >
                      {m}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                className="text-white rounded-xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" /> Importar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={importar}
              />

              <Button
                className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] rounded-xl"
                onClick={() => setOpenNovo(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Novo Custo
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  {["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"].map(
                    (h) => (
                      <TableHead
                        key={h}
                        className="text-gray-400 font-semibold"
                      >
                        {h}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-400 py-8"
                      >
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : currentItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-500 py-8"
                      >
                        Nenhum resultado
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentItems.map((custo, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-white/10 hover:bg-white/5"
                      >
                        <TableCell className="text-white">
                          {custo["Código"]}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{custo["Marca"]}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          R$ {Number(custo["Custo Atual"]).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          R$ {Number(custo["Custo Antigo"]).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {custo["NCM"]}
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          <TableControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={custosFiltrados.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </GlassmorphicCard>
      </div>

      {/* Modal Novo Custo */}
      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent className="sm:max-w-[520px] bg-[#0f0f0f] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Custo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {[
              ["Código", "codigo"],
              ["Marca", "marca"],
              ["Custo Atual", "custo_atual"],
              ["Custo Antigo", "custo_antigo"],
              ["NCM", "ncm"],
            ].map(([label, key], i) => (
              <div
                key={i}
                className={`space-y-2 ${key === "ncm" ? "md:col-span-2" : ""}`}
              >
                <Label className="text-gray-300">{label}</Label>
                <Input
                  type={key.includes("custo") ? "number" : "text"}
                  step="0.01"
                  value={(novo as any)[key]}
                  onChange={(e) =>
                    setNovo((s) => ({ ...s, [key]: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white rounded-lg"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#f59e0b] to-[#d97706]"
              onClick={handleSalvarNovo}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
