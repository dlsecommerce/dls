"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Anuncio } from "@/components/announce/types/Announce";
import { ORDERABLE_COLUMNS } from "../utils/constants";
import { RowShape, mapRowToAnuncio } from "../utils/mapRowToAnuncio";

/**
 * Hook responsável por:
 * - carregar anúncios da view unificada "anuncios_all"
 * - aplicar filtros, paginação e ordenação
 * - manter compatibilidade com o dashboard atual
 */
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

  // seleção
  const [selectedRows, setSelectedRows] = useState<Anuncio[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** 🔹 Monta o filtro de busca */
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

  /** 🔹 Carrega valores distintos de Marca e Categoria */
  const fetchDistinct = async (column: "Marca" | "Categoria") => {
    const { data, error } = await supabase
      .from("anuncios_all")
      .select(`${column}`, { distinct: true })
      .not(column, "is", null)
      .neq(column, "")
      .order(column, { ascending: true })
      .limit(20000);

    if (error) {
      console.error("❌ distinct error", column, error);
      return [];
    }

    return [...new Set(data.map((r: any) => String(r[column] ?? "")))];
  };

  /** 🔹 Atualiza filtros */
  const hydrateFacets = async () => {
    const [marcas, categorias] = await Promise.all([
      fetchDistinct("Marca"),
      fetchDistinct("Categoria"),
    ]);
    setAllBrands(marcas.sort());
    setAllCategorias(categorias.sort());
  };

  /** 🔹 Carrega anúncios */
  const loadAnuncios = async (page = 1) => {
    setLoading(true);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("anuncios_all")
        .select("*", { count: "exact" })
        .range(from, to);

      // Filtros
      if (debouncedSearch.trim()) query = query.or(buildOr(debouncedSearch.trim()));
      if (selectedBrands.length) query = query.in("Marca", selectedBrands);
      if (selectedCategoria.length) query = query.in("Categoria", selectedCategoria);
      if (selectedLoja.length) query = query.in("Loja", selectedLoja);

      // 🔹 Ordenação
      const primaryCol =
        sortColumn && ORDERABLE_COLUMNS[sortColumn]
          ? ORDERABLE_COLUMNS[sortColumn]
          : "ID";

      query = query.order(primaryCol, {
        ascending: sortDirection === "asc",
        nullsFirst: false,
      });

      // 🔹 Caso queira sempre estabilizar por ID
      if (primaryCol !== "ID") {
        query = query.order("ID", { ascending: true });
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((r: RowShape) =>
        mapRowToAnuncio(r, "anuncios_all")
      );

      // Corrige caso "Loja" venha nula
      mapped.forEach((r) => {
        if (!r.loja) r.loja = r.id < 10000 ? "Pikot Shop" : "Sóbaquetas";
      });

      setRows(mapped);
      setTotalItems(count || 0);
    } catch (err) {
      console.error("❌ Erro ao carregar anúncios:", err);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // debounce da pesquisa
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // inicialização
  useEffect(() => {
    hydrateFacets();
  }, []);

  // recarrega ao mudar filtros/paginação/ordenação
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

  /** 🔹 Ordenação manual */
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

  /** 🔹 Seleção */
  const toggleRow = (row: Anuncio) => {
    setSelectedRows((prev) =>
      prev.some((r) => r.id === row.id)
        ? prev.filter((r) => r.id !== row.id)
        : [...prev, row]
    );
  };

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedRows.some((s) => s.id === r.id));

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const toAdd = rows.filter((r) => !selectedRows.some((s) => s.id === r.id));
      setSelectedRows((prev) => [...prev, ...toAdd]);
    } else {
      const remaining = selectedRows.filter((s) => !rows.some((r) => r.id === s.id));
      setSelectedRows(remaining);
    }
  };

  const deleteSelected = () => {
    if (selectedRows.length === 0) return;
    const remaining = rows.filter((r) => !selectedRows.some((s) => s.id === r.id));
    setRows(remaining);
    setSelectedRows([]);
  };

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
