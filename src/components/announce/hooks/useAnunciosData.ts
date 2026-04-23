"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Anuncio } from "@/components/announce/types/Announce";
import { AnuncioFilters } from "@/components/announce/AnnounceTable/types";
import { ORDERABLE_COLUMNS } from "../utils/constants";
import { RowShape, mapRowToAnuncio } from "../utils/mapRowToAnuncio";

/* ===========================
   Helpers URL / Busca
=========================== */

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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

function buildMarcaParts(tokens: string[]) {
  const parts: string[] = [];

  for (const term of tokens) {
    if (!term) continue;

    const escaped = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    parts.push(`"Marca".ilike."%${escaped}%"`);
  }

  return parts;
}

function normalizeLojaToCode(value: string) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "pikot shop" || v === "pk") return "PK";
  if (v === "sóbaquetas" || v === "sobaquetas" || v === "sb") return "SB";

  return value;
}

export function useAnunciosData(filters: AnuncioFilters) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ===========================
     Estados iniciais da URL
  =========================== */

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialSortColumn = searchParams.get("sortColumn") || null;
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

  const [allCategorias, setAllCategorias] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(initialSortColumn);
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

  const hydrateCategorias = async () => {
    const { data } = await supabase
      .from("anuncios_all")
      .select("Categoria", { distinct: true })
      .not("Categoria", "is", null)
      .neq("Categoria", "")
      .order("Categoria", { ascending: true })
      .limit(20000);

    const categorias = [
      ...new Set((data || []).map((r: any) => String(r.Categoria ?? "").trim())),
    ].filter(Boolean);

    setAllCategorias(categorias.sort((a, b) => a.localeCompare(b)));
  };

  /* ===========================
     Carregar anúncios
  =========================== */

  const loadAnuncios = async (page = currentPage, limit = itemsPerPage) => {
    setLoading(true);

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("anuncios_all")
        .select("*", { count: "exact" })
        .range(from, to);

      /* ===== Busca global ===== */
      if (debouncedSearch.trim()) {
        const tokens = parseSearchTokens(debouncedSearch.trim());
        const orParts = buildOrSearchParts(tokens);

        if (orParts.length) {
          query = query.or(orParts.join(","));
        }
      }

      /* ===== Marca ===== */
      if (filters.marca.trim()) {
        const marcaTokens = parseSearchTokens(filters.marca);

        if (marcaTokens.length === 1) {
          query = query.ilike("Marca", `%${marcaTokens[0]}%`);
        } else if (marcaTokens.length > 1) {
          const marcaParts = buildMarcaParts(marcaTokens);
          query = query.or(marcaParts.join(","));
        }
      }

      /* ===== Categoria ===== */
      if (filters.categoria && filters.categoria !== "Todos") {
        query = query.eq("Categoria", filters.categoria);
      }

      /* ===== Tipo ===== */
      if (filters.tipo && filters.tipo !== "Todos") {
        if (filters.tipo === "Produtos") {
          query = query.eq("Tipo", "PAI");
        } else if (filters.tipo === "Produtos simples") {
          query = query.eq("Tipo", "Produto simples");
        } else if (filters.tipo === "Produtos com variações") {
          query = query.eq("Tipo", "Produto com variações");
        } else if (filters.tipo === "Variações") {
          query = query.eq("Tipo", "Variação");
        }
      }

      /* ===== Lojas Virtuais ===== */
      if (filters.lojasVirtuais && filters.lojasVirtuais !== "Todos") {
        const lojaCode = normalizeLojaToCode(filters.lojasVirtuais);
        query = query.eq("Loja", lojaCode);
      }

      /* ===== Ordenação padrão / manual ===== */
      const primaryCol =
        sortColumn && ORDERABLE_COLUMNS[sortColumn]
          ? ORDERABLE_COLUMNS[sortColumn]
          : null;

      if (primaryCol) {
        query = query.order(primaryCol, {
          ascending: sortDirection === "asc",
          nullsFirst: false,
        });

        if (primaryCol !== "ID") {
          query = query.order("ID", { ascending: true });
        }
      } else {
        query = query.order("ID", { ascending: false });
      }

      /* ===== Situação ===== */
      if (filters.situacao === "Últimos Incluídos" && !primaryCol) {
        query = query.order("ID", { ascending: false });
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
          ) {
            tabela = "anuncios_sb";
          }

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

      await loadAnuncios(currentPage, itemsPerPage);

      setSelectedRows([]);
      setOpenDelete(false);
    } catch (err: any) {
      alert("Erro ao excluir anúncios: " + (err.message || err));
    } finally {
      setDeleting(false);
    }
  }, [selectedRows, currentPage, itemsPerPage]);

  /* ===========================
     URL -> State
  =========================== */

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlSortColumn = searchParams.get("sortColumn") || null;
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    setSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setDebouncedSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setCurrentPage((prev) => (prev !== urlPage ? urlPage : prev));
    setItemsPerPage((prev) => (prev !== urlPerPage ? urlPerPage : prev));
    setSortColumn((prev) => (prev !== urlSortColumn ? urlSortColumn : prev));
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
    setSelectedRows([]);
    setCurrentPage(1);
  }, [
    debouncedSearch,
    filters.situacao,
    filters.categoria,
    filters.tipo,
    filters.lojasVirtuais,
    filters.marca,
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
    if (sortColumn) params.set("sortColumn", sortColumn);
    if (sortColumn && sortDirection !== "asc") {
      params.set("sortDirection", sortDirection);
    }

    const nextUrl = params.toString() ? `?${params.toString()}` : "?";

    if (lastUrlRef.current === nextUrl) return;
    lastUrlRef.current = nextUrl;

    router.replace(nextUrl, { scroll: false });
  }, [
    search,
    currentPage,
    itemsPerPage,
    sortColumn,
    sortDirection,
    router,
  ]);

  /* ===========================
     Effects principais
  =========================== */

  useEffect(() => {
    hydrateCategorias();
  }, []);

  useEffect(() => {
    loadAnuncios(currentPage, itemsPerPage);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearch,
    filters.situacao,
    filters.categoria,
    filters.tipo,
    filters.lojasVirtuais,
    filters.marca,
    sortColumn,
    sortDirection,
  ]);

  /* ===========================
     Sort / seleção
  =========================== */

  const handleSort = (col: string) => {
    if (!(col in ORDERABLE_COLUMNS)) return;

    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
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
    allCategorias,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    search,
    setSearch,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
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