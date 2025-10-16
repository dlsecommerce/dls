"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Anuncio } from "@/components/announce/types/Announce";
import { TableName, ORDERABLE_COLUMNS, SHOP_LABEL, toNum } from "../utils/constants";
import { RowShape, mapRowToAnuncio } from "../utils/mapRowToAnuncio";

/**
 * Hook responsável por:
 * - carregar anúncios com filtros e paginação real via Supabase
 * - gerenciar ordenação, filtros e seleção
 * - expor handlers e estados prontos para o componente principal
 */
export function useAnunciosData() {
  const [rows, setRows] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);

  // paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search); // 🔹 debounce da pesquisa
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLojas, setAllLojas] = useState<string[]>(["Pikot Shop", "Sóbaquetas"]);
  const [allCategorias, setAllCategorias] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // ordenação
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // seleção local
  const [selectedRows, setSelectedRows] = useState<Anuncio[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** 🔹 Helpers para buildar filtros no Supabase */
  const buildOr = (term: string) => {
    const like = `%${term}%`;
    const isNumeric = /^[0-9]+$/.test(term); // 🔹 Detecta número puro (ex: 1531)

    if (isNumeric) {
      // 🔸 Busca exata por código numérico (ID Bling, ID Tray ou Referência)
      return [
        `"ID Bling".eq.${term}`,
        `"ID Tray".eq.${term}`,
        `"Referência".eq.${term}`,
      ].join(",");
    }

    // 🔸 Busca ampla padrão (texto)
    return [
      `"Nome".ilike.${like}`,
      `"Marca".ilike.${like}`,
      `"ID Bling".ilike.${like}`,
      `"ID Tray".ilike.${like}`,
      `"Referência".ilike.${like}`,
    ].join(",");
  };

  /** 🔹 Determina quais tabelas consultar conforme loja selecionada */
  const getTablesForLoja = (): TableName[] => {
    if (selectedLoja.length === 0) return ["anuncios_pk", "anuncios_sb"];
    const wantsPk = selectedLoja.includes("Pikot Shop");
    const wantsSb = selectedLoja.includes("Sóbaquetas");
    const list: TableName[] = [];
    if (wantsPk) list.push("anuncios_pk");
    if (wantsSb) list.push("anuncios_sb");
    return list;
  };

  /** 🔹 Aplica filtros e ordenação no nível do Supabase */
  const applyFiltersForTable = <T,>(
    q: T & {
      or: (f: string) => T;
      in: (col: string, vals: string[]) => T;
      order: (col: string, opts?: { ascending: boolean; nullsFirst?: boolean }) => T;
    },
    table: TableName
  ) => {
    if (debouncedSearch.trim()) q = (q as any).or(buildOr(debouncedSearch.trim()));
    if (selectedBrands.length) q = (q as any).in("Marca", selectedBrands);
    if (selectedCategoria.length) q = (q as any).in("Categoria", selectedCategoria);

    if (sortColumn && ORDERABLE_COLUMNS[sortColumn] && sortColumn !== "Loja") {
      const map: Record<keyof Anuncio, string> = {
        id: "ID",
        loja: "Loja",
        id_bling: "ID Bling",
        id_tray: "ID Tray",
        id_var: "ID Var",
        od: "OD",
        referencia: "Referência",
        nome: "Nome",
        marca: "Marca",
        categoria: "Categoria",
        peso: "Peso",
        altura: "Altura",
        largura: "Largura",
        comprimento: "Comprimento",
        codigo_1: "Código 1",
        quantidade_1: "Quantidade 1",
        codigo_2: "Código 2",
        quantidade_2: "Quantidade 2",
        codigo_3: "Código 3",
        quantidade_3: "Quantidade 3",
        codigo_4: "Código 4",
        quantidade_4: "Quantidade 4",
        codigo_5: "Código 5",
        quantidade_5: "Quantidade 5",
        codigo_6: "Código 6",
        quantidade_6: "Quantidade 6",
        codigo_7: "Código 7",
        quantidade_7: "Quantidade 7",
        codigo_8: "Código 8",
        quantidade_8: "Quantidade 8",
        codigo_9: "Código 9",
        quantidade_9: "Quantidade 9",
        codigo_10: "Código 10",
        quantidade_10: "Quantidade 10",
      };
      const colPhysical = map[ORDERABLE_COLUMNS[sortColumn]];
      if (colPhysical) {
        q = (q as any).order(colPhysical, {
          ascending: sortDirection === "asc",
          nullsFirst: false,
        });
      }
    }
    return q;
  };

  /** 🔹 Busca valores distintos de Marca/Categoria */
  const fetchDistinct = async (table: TableName, column: "Marca" | "Categoria") => {
    const { data, error } = await supabase
      .from(table)
      .select(`${column}`, { distinct: true })
      .not(column, "is", null)
      .neq(column, "")
      .order(column, { ascending: true })
      .limit(20000);
    if (error) {
      console.error("distinct error", table, column, error);
      return [] as string[];
    }
    const vals = (data || []).map((r: any) => String(r[column] ?? "")).filter(Boolean);
    return Array.from(new Set(vals));
  };

  /** 🔹 Hidrata filtros */
  const hydrateFacets = async () => {
    const [marcasPk, marcasSb] = await Promise.all([
      fetchDistinct("anuncios_pk", "Marca"),
      fetchDistinct("anuncios_sb", "Marca"),
    ]);
    const [catsPk, catsSb] = await Promise.all([
      fetchDistinct("anuncios_pk", "Categoria"),
      fetchDistinct("anuncios_sb", "Categoria"),
    ]);
    setAllBrands(Array.from(new Set([...marcasPk, ...marcasSb])).sort());
    setAllCategorias(Array.from(new Set([...catsPk, ...catsSb])).sort());
  };

  /** 🔹 Carrega anúncios com filtros e paginação */
  const loadAnuncios = async (page = 1) => {
    setLoading(true);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const tables = getTablesForLoja();

      if (tables.length === 0) {
        setRows([]);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      const countPromises = tables.map((t) =>
        applyFiltersForTable(
          supabase.from(t).select("*", { count: "exact", head: true }) as any,
          t
        )
      );
      const countResults = await Promise.all(countPromises);
      // @ts-ignore
      const total = countResults.reduce((acc, r) => acc + (r?.count ?? 0), 0);
      setTotalItems(total);

      const buffer = itemsPerPage;
      const tFrom = from;
      const tTo = tFrom + buffer - 1;

      const dataPromises = tables.map((t) =>
        applyFiltersForTable(
          supabase.from(t).select("*").range(tFrom, tTo) as any,
          t
        )
      );
      const dataResults = await Promise.all(dataPromises);

      const mapped: Anuncio[] = [];
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        const res: any = dataResults[i];
        if (res?.error) {
          console.error("data error", t, res.error);
          continue;
        }
        const data: RowShape[] = (res?.data || []) as RowShape[];
        mapped.push(...data.map((r) => mapRowToAnuncio(r, t)));
      }

      if (sortColumn && ORDERABLE_COLUMNS[sortColumn]) {
        const key = ORDERABLE_COLUMNS[sortColumn];
        mapped.sort((a, b) => {
          const A = String(a[key] ?? "").toLowerCase();
          const B = String(b[key] ?? "").toLowerCase();
          if (A < B) return sortDirection === "asc" ? -1 : 1;
          if (A > B) return sortDirection === "asc" ? 1 : -1;
          return 0;
        });
      }

      const pageSlice = mapped.slice(0, itemsPerPage);
      setRows(pageSlice);
    } catch (err) {
      console.error("Erro ao carregar anúncios:", err);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 debounce da pesquisa — evita recarregar a cada tecla digitada
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // espera 0.5s após o usuário parar de digitar
    return () => clearTimeout(handler);
  }, [search]);

  // inicialização
  useEffect(() => {
    hydrateFacets();
  }, []);

  // recarrega ao mudar filtros
  useEffect(() => {
    loadAnuncios(currentPage);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearch, // usa o valor com debounce
    selectedBrands,
    selectedLoja,
    selectedCategoria,
    sortColumn,
    sortDirection,
  ]);

  /** 🔹 Ordenação */
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
    // data
    rows,
    loading,
    totalItems,
    allBrands,
    allLojas,
    allCategorias,
    selectedBrands,
    selectedLoja,
    selectedCategoria,

    // pagination
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,

    // filters
    search,
    setSearch,
    setSelectedBrands,
    setSelectedLoja,
    setSelectedCategoria,
    filterOpen,
    setFilterOpen,

    // sorting
    sortColumn,
    sortDirection,
    handleSort,

    // selection
    selectedRows,
    toggleRow,
    allVisibleSelected,
    toggleSelectAllVisible,
    openDelete,
    setOpenDelete,
    deleting,
    setDeleting,
    deleteSelected,

    // loader
    loadAnuncios,
  };
}
