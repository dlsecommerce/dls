import { toast } from "sonner";
import { useCallback, useState } from "react";

const [exportingChannelRules, setExportingChannelRules] = useState(false);

const handleExportChannelRules = useCallback(async () => {
  setExportingChannelRules(true);
  try {
    const res = await fetch("/api/marketplace/channel-rules/export");
    if (!res.ok) throw new Error("Falha ao exportar.");

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const fileName = match ? decodeURIComponent(match[1]) : "regras-marketplace.xlsx";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Erro ao exportar regras de canal.");
  } finally {
    setExportingChannelRules(false);
  }
}, []);

const handleImportChannelRules = useCallback(async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/marketplace/channel-rules/import", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error ?? "Erro ao importar.");
      if (result.details) console.error(result.details);
      return;
    }

    toast.success(
      `${result.updatedChannels}/${result.totalChannels} canal(is) atualizados com sucesso.`
    );

    if (result.errors?.length) {
      toast.warning(`Alguns canais falharam: ${result.errors.join(" | ")}`);
    }

    // recarregar lista/tabela de canais aqui
  } catch {
    toast.error("Erro ao processar o arquivo importado.");
  }
}, []);
