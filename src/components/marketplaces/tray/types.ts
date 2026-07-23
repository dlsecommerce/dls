export type TrayFilters = {
  situacao: string;
  tipo: string;
  lojasVirtuais: string;
  marca: string;
};

export const DEFAULT_TRAY_FILTERS: TrayFilters = {
  situacao: "",
  tipo: "",
  lojasVirtuais: "",
  marca: "",
};
