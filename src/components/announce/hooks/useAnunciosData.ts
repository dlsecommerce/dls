"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Anuncio } from "@/components/announce/types/Announce";
import { ORDERABLE_COLUMNS } from "../utils/constants";
import { RowShape, mapRowToAnuncio } from "../utils/mapRowToAnuncio";

/* ===========================
   Helpers URL / Busca
=========================== */

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArrayParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => item === b[idx]);
}

function sanitizeTerm(input: string) {
  return input.replace(/[%_]/g, "").replace(/"/g, "").trim();
}

function parseSearchTokens(q: string) {
  return q
    .split(",")
    .map((s) => sanitizeTerm(s))
    .filter(Boolean);
}

function escapeForOrValue(v: string) {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildOrSearchParts(tokens: string[]) {
  const orParts: string[] = [];

  for (const term of tokens) {
    if (!term) continue;

    const variants = Array.from(
      new Set([
        term,
        term.replace(/\s+/g, " "),
        term.replace(/\s+/g, "-"),
        term.replace(/\s+/g, ""),
      ])
    );

    const isNumeric = /^[0-9]+$/.test(term);

    for (const v of variants) {
      const pattern = escapeForOrValue(`%${v}%`);

      orParts.push(`"Nome".ilike.${pattern}`);
      orParts.push(`"Marca".ilike.${pattern}`);
      orParts.push(`"Categoria".ilike.${pattern}`);
      orParts.push(`"Referência".ilike.${pattern}`);
      orParts.push(`"ID Bling".ilike.${pattern}`);
      orParts.push(`"ID Tray".ilike.${pattern}`);
    }

    if (isNumeric) {
      orParts.push(`"ID Bling".eq.${term}`);
      orParts.push(`"ID Tray".eq.${term}`);
      orParts.push(`"Referência".eq.${term}`);
      orParts.push(`"ID".eq.${term}`);
    }
  }

  return orParts;
}

export function useAnunciosData() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ===========================
     Estados iniciais da URL
  =========================== */

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialLojas = parseArrayParam(searchParams.get("lojas"));
  const initialCategorias = parseArrayParam(searchParams.get("categorias"));
  const initialSortColumn = searchParams.get("sortColumn") || "ID";
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

  /* ===========================
     Estados
  =========================== */

  const [rows, setRows] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLojas] = useState<string[]>(["Pikot Shop", "Sóbaquetas"]);
  const [allCategorias, setAllCategorias] = useState<string[]>([]);

  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [selectedLoja, setSelectedLoja] = useState<string[]>(initialLojas);
  const [selectedCategoria, setSelectedCategoria] =
    useState<string[]>(initialCategorias);

  const [filterOpen, setFilterOpen] = useState(false);

  const [sortColumn, setSortColumn] = useState<string>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

  const [selectedRows, setSelectedRows] = useState<Anuncio[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const didHydrateFromUrlRef = useRef(false);
  const lastUrlRef = useRef("");

  /* ===========================
     Facets
  =========================== */

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

  /* ===========================
     Carregar anúncios
  =========================== */

  const loadAnuncios = async (page = currentPage) => {
    setLoading(true);

    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("anuncios_all")
        .select("*", { count: "exact" })
        .range(from, to);

      if (debouncedSearch.trim()) {
        const tokens = parseSearchTokens(debouncedSearch.trim());
        const orParts = buildOrSearchParts(tokens);

        if (orParts.length) {
          query = query.or(orParts.join(","));
        }
      }

      if (selectedBrands.length) query = query.in("Marca", selectedBrands);
      if (selectedCategoria.length)
        query = query.in("Categoria", selectedCategoria);

      if (selectedLoja.length) {
        const lojaCodes = selectedLoja.map((loja) =>
          loja === "Pikot Shop"
            ? "PK"
            : loja === "Sóbaquetas"
            ? "SB"
            : loja
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

      if (primaryCol !== "ID") {
        query = query.order("ID", { ascending: true });
      }

      const { data, count, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((r: RowShape) => {
        const anuncio = mapRowToAnuncio(r, "anuncios_all");

        anuncio.loja =
          r.Loja === "PK"
            ? "Pikot Shop"
            : r.Loja === "SB"
            ? "Sóbaquetas"
            : r.Loja || "Desconhecida";

        anuncio.id = r.ID;

        return anuncio;
      });

      setRows(mapped);
      setTotalItems(count || 0);
    } catch (err) {
      console.error("Erro ao carregar anúncios:", err);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  /* ===========================
     Delete
  =========================== */

  const deleteSelected = useCallback(async () => {
    if (!selectedRows?.length) {
      alert("Nenhum item selecionado.");
      return;
    }

    setDeleting(true);

    try {
      const grouped = selectedRows.reduce<Record<string, string[]>>(
        (acc, row) => {
          const loja = (row.loja || row.Loja || "").toString().toLowerCase();

          let tabela = "";
          if (loja.includes("pikot") || loja === "pk") tabela = "anuncios_pk";
          else if (
            loja.includes("sobaquetas") ||
            loja.includes("sóbaquetas") ||
            loja === "sb"
          )
            tabela = "anuncios_sb";

          if (!tabela) return acc;

          const id = String(row.id ?? row.ID ?? "").trim();
          if (!id) return acc;

          acc[tabela] = acc[tabela] || [];
          acc[tabela].push(id);

          return acc;
        },
        {}
      );

      await Promise.all(
        Object.entries(grouped).map(async ([tabela, ids]) => {
          const { error } = await supabase.from(tabela).delete().in("ID", ids);
          if (error) throw error;
        })
      );

      await loadAnuncios(currentPage);

      setSelectedRows([]);
      setOpenDelete(false);
    } catch (err: any) {
      alert("Erro ao excluir anúncios: " + (err.message || err));
    } finally {
      setDeleting(false);
    }
  }, [selectedRows, currentPage]);

  /* ===========================
     URL -> State
  =========================== */

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlBrands = parseArrayParam(searchParams.get("brands"));
    const urlLojas = parseArrayParam(searchParams.get("lojas"));
    const urlCategorias = parseArrayParam(searchParams.get("categorias"));
    const urlSortColumn = searchParams.get("sortColumn") || "ID";
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    setSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setDebouncedSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setCurrentPage((prev) => (prev !== urlPage ? urlPage : prev));
    setItemsPerPage((prev) => (prev !== urlPerPage ? urlPerPage : prev));

    setSelectedBrands((prev) =>
      arraysEqual(prev, urlBrands) ? prev : urlBrands
    );
    setSelectedLoja((prev) =>
      arraysEqual(prev, urlLojas) ? prev : urlLojas
    );
    setSelectedCategoria((prev) =>
      arraysEqual(prev, urlCategorias) ? prev : urlCategorias
    );

    setSortColumn((prev) =>
      prev !== urlSortColumn ? urlSortColumn : prev
    );
    setSortDirection((prev) =>
      prev !== urlSortDirection ? urlSortDirection : prev
    );

    didHydrateFromUrlRef.current = true;
  }, [searchParams]);

  /* ===========================
     Debounce
  =========================== */

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [search]);

  /* ===========================
     Busca / filtros reset página
  =========================== */

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [
    debouncedSearch,
    selectedBrands,
    selectedLoja,
    selectedCategoria,
  ]);

  /* ===========================
     State -> URL
  =========================== */

  useEffect(() => {
    if (!didHydrateFromUrlRef.current) return;

    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (currentPage > 1) params.set("page", String(currentPage));
    if (itemsPerPage !== 50) params.set("perPage", String(itemsPerPage));

    if (selectedBrands.length)
      params.set("brands", selectedBrands.join(","));

    if (selectedLoja.length)
      params.set("lojas", selectedLoja.join(","));

    if (selectedCategoria.length)
      params.set("categorias", selectedCategoria.join(","));

    if (sortColumn) params.set("sortColumn", sortColumn);

    if (sortDirection !== "asc")
      params.set("sortDirection", sortDirection);

    const nextUrl = params.toString() ? `?${params.toString()}` : "?";

    if (lastUrlRef.current === nextUrl) return;

    lastUrlRef.current = nextUrl;

    router.replace(nextUrl, { scroll: false });
  }, [
    search,
    currentPage,
    itemsPerPage,
    selectedBrands,
    selectedLoja,
    selectedCategoria,
    sortColumn,
    sortDirection,
    router,
  ]);

  /* ===========================
     Effects principais
  =========================== */

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

  /* ===========================
     Sort / seleção
  =========================== */

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
      prev.some(
        (r) =>
          (r.id ?? r.ID) === (row.id ?? row.ID) &&
          (r.loja ?? r.Loja) === (row.loja ?? row.Loja)
      )
        ? prev.filter(
            (r) =>
              !(
                (r.id ?? r.ID) === (row.id ?? row.ID) &&
                (r.loja ?? r.Loja) === (row.loja ?? row.Loja)
              )
          )
        : [...prev, row]
    );
  };

  const allVisibleSelected =
    rows.length > 0 &&
    rows.every((r) =>
      selectedRows.some(
        (s) =>
          (s.id ?? s.ID) === (r.id ?? r.ID) &&
          (s.loja ?? s.Loja) === (r.loja ?? r.Loja)
      )
    );

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const toAdd = rows.filter(
        (r) =>
          !selectedRows.some(
            (s) =>
              (s.id ?? s.ID) === (r.id ?? r.ID) &&
              (s.loja ?? s.Loja) === (r.loja ?? r.Loja)
          )
      );
      setSelectedRows((prev) => [...prev, ...toAdd]);
    } else {
      const remaining = selectedRows.filter(
        (s) =>
          !rows.some(
            (r) =>
              (r.id ?? r.ID) === (s.id ?? s.ID) &&
              (r.loja ?? r.Loja) === (s.loja ?? s.Loja)
          )
      );
      setSelectedRows(remaining);
    }
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
    setSelectedRows,
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