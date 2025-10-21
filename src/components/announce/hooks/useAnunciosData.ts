"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Anuncio } from "@/components/announce/types/Announce";
import { ORDERABLE_COLUMNS } from "../utils/constants";
import { RowShape, mapRowToAnuncio } from "../utils/mapRowToAnuncio";

export function useAnunciosData() {
  const [rows, setRows] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);

  // paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);

  // filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLojas, setAllLojas] = useState<string[]>(["Pikot Shop", "Sóbaquetas"]);
  const [allCategorias, setAllCategorias] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // ordenação
  const [sortColumn, setSortColumn] = useState<string>("ID");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // seleção / exclusão
  const [selectedRows, setSelectedRows] = useState<Anuncio[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ===========================================================
  // 🔍 Funções auxiliares
  // ===========================================================

  const buildOr = (term: string) => {
    const like = `%${term}%`;
    const isNumeric = /^[0-9]+$/.test(term);

    if (isNumeric) {
      return [
        `"ID Bling".eq.${term}`,
        `"ID Tray".eq.${term}`,
        `"Referência".eq.${term}`,
      ].join(",");
    }

    return [
      `"Nome".ilike.${like}`,
      `"Marca".ilike.${like}`,
      `"Categoria".ilike.${like}`,
      `"Referência".ilike.${like}`,
      `"ID Bling".ilike.${like}`,
      `"ID Tray".ilike.${like}`,
    ].join(",");
  };

  const fetchDistinct = async (column: "Marca" | "Categoria") => {
    const { data } = await supabase
      .from("anuncios_all")
      .select(`${column}`, { distinct: true })
      .not(column, "is", null)
      .neq(column, "")
      .order(column, { ascending: true })
      .limit(20000);

    return [...new Set((data || []).map((r: any) => String(r[column] ?? "")))];
  };

  const hydrateFacets = async () => {
    const [marcas, categorias] = await Promise.all([
      fetchDistinct("Marca"),
      fetchDistinct("Categoria"),
    ]);
    setAllBrands(marcas.sort());
    setAllCategorias(categorias.sort());
  };

  // ===========================================================
  // 📦 Carregar anúncios
  // ===========================================================
  const loadAnuncios = async (page = 1) => {
    setLoading(true);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("anuncios_all")
        .select("*", { count: "exact" })
        .range(from, to);

      if (debouncedSearch.trim()) query = query.or(buildOr(debouncedSearch.trim()));
      if (selectedBrands.length) query = query.in("Marca", selectedBrands);
      if (selectedCategoria.length) query = query.in("Categoria", selectedCategoria);

      if (selectedLoja.length) {
        const lojaCodes = selectedLoja.map((loja) =>
          loja === "Pikot Shop" ? "PK" : loja === "Sóbaquetas" ? "SB" : loja
        );
        query = query.in("Loja", lojaCodes);
      }

      const primaryCol =
        sortColumn && ORDERABLE_COLUMNS[sortColumn]
          ? ORDERABLE_COLUMNS[sortColumn]
          : "ID";

      query = query.order(primaryCol, {
        ascending: sortDirection === "asc",
        nullsFirst: false,
      });

      if (primaryCol !== "ID") query = query.order("ID", { ascending: true });

      const { data, count } = await query;

      const mapped = (data || []).map((r: RowShape) => {
        const anuncio = mapRowToAnuncio(r, "anuncios_all");
        anuncio.loja =
          r.Loja === "PK"
            ? "Pikot Shop"
            : r.Loja === "SB"
            ? "Sóbaquetas"
            : r.Loja || "Desconhecida";
        return anuncio;
      });

      setRows(mapped);
      setTotalItems(count || 0);
    } catch {
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================
  // 🗑️ Exclusão com recarregamento automático
  // ===========================================================
  const deleteSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;
    setDeleting(true);

    try {
      for (const row of selectedRows) {
        const lojaCodigo =
          row.loja === "Pikot Shop" ? "PK" : row.loja === "Sóbaquetas" ? "SB" : null;

        const tabela =
          lojaCodigo === "PK"
            ? "anuncios_pk"
            : lojaCodigo === "SB"
            ? "anuncios_sb"
            : null;

        if (!tabela || !row.id) continue;

        await supabase
          .from(tabela)
          .delete()
          .eq("ID", String(row.id).trim())
          .eq("Loja", lojaCodigo);
      }

      // 🔄 Recarrega os anúncios após exclusão
      await loadAnuncios(currentPage);

      setSelectedRows([]);
      setOpenDelete(false);
    } catch (err: any) {
      alert("Erro ao excluir: " + (err.message || err));
    } finally {
      setDeleting(false);
    }
  }, [selectedRows, currentPage]);

  // ===========================================================
  // ⚙️ Efeitos e comportamento padrão
  // ===========================================================
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    hydrateFacets();
  }, []);

  useEffect(() => {
    loadAnuncios(currentPage);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearch,
    selectedBrands,
    selectedLoja,
    selectedCategoria,
    sortColumn,
    sortDirection,
  ]);

  // ===========================================================
  // 🧭 Ordenação e seleção
  // ===========================================================
  const handleSort = (col: string) => {
    if (!(col in ORDERABLE_COLUMNS)) return;
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const toggleRow = (row: Anuncio) => {
    setSelectedRows((prev) =>
      prev.some((r) => r.id === row.id && r.loja === row.loja)
        ? prev.filter((r) => !(r.id === row.id && r.loja === row.loja))
        : [...prev, row]
    );
  };

  const allVisibleSelected =
    rows.length > 0 &&
    rows.every((r) =>
      selectedRows.some((s) => s.id === r.id && s.loja === r.loja)
    );

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const toAdd = rows.filter(
        (r) => !selectedRows.some((s) => s.id === r.id && s.loja === r.loja)
      );
      setSelectedRows((prev) => [...prev, ...toAdd]);
    } else {
      const remaining = selectedRows.filter(
        (s) => !rows.some((r) => r.id === s.id && r.loja === s.loja)
      );
      setSelectedRows(remaining);
    }
  };

  // ===========================================================
  // 🧩 Retorno
  // ===========================================================
  return {
    rows,
    loading,
    totalItems,
    allBrands,
    allLojas,
    allCategorias,
    selectedBrands,
    selectedLoja,
    selectedCategoria,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    search,
    setSearch,
    setSelectedBrands,
    setSelectedLoja,
    setSelectedCategoria,
    filterOpen,
    setFilterOpen,
    sortColumn,
    sortDirection,
    handleSort,
    selectedRows,
    toggleRow,
    allVisibleSelected,
    toggleSelectAllVisible,
    openDelete,
    setOpenDelete,
    deleting,
    setDeleting,
    deleteSelected,
    loadAnuncios,
  };
}
