export const getRowKey = (row: any) => {
  const loja = String(row?.loja ?? row?.Loja ?? "").trim();

  const id = String(
    row?.idReal ??
      row?.id ??
      row?.ID ??
      row?.id_tray ??
      row?.["ID Tray"] ??
      row?.referencia ??
      row?.["Referência"] ??
      ""
  ).trim();

  return `${loja}-${id}`;
};

export const chunkArray = <T,>(array: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
