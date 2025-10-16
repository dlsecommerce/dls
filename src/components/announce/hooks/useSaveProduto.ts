"use client";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSaveProduto = (produto: any, setProduto: any, composicao: any, toInternal: any) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const pid = produto.id || crypto.randomUUID();

      await supabase.from("custos").delete().eq("produto_id", pid);
      const rows = composicao
        .filter((i: any) => i.codigo.trim())
        .map((i: any) => ({
          produto_id: pid,
          codigo: i.codigo.trim(),
          quantidade: parseFloat(toInternal(i.quantidade)) || 0,
          custo_atual: parseFloat(toInternal(i.custo)) || 0,
        }));

      if (rows.length) {
        const { error } = await supabase.from("custos").insert(rows);
        if (error) throw error;
      }

      setProduto((p: any) => ({ ...p, id: pid }));
      toast({
        title: "Produto salvo com sucesso!",
        description: "Custos foram armazenados corretamente.",
      });
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um problema ao salvar os custos.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave };
};
