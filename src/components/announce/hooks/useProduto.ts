"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const useProduto = () => {
  const searchParams = useSearchParams();
  const [produto, setProduto] = useState({
    id: "",
    id_bling: "",
    referencia: "",
    id_tray: "",
    id_var: "",
    od: "",
    nome: "",
    marca: "",
    categoria: "",
    tipo_anuncio: "simples",
    peso: "",
    altura: "",
    largura: "",
    comprimento: "",
  });

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) setProduto((p) => ({ ...p, id: idParam }));
  }, [searchParams]);

  return { produto, setProduto };
};
