// ─────────────────────────────────────────────
// 1) Importprogresstoast.tsx — adicionar a prop `doneTitle`
// ─────────────────────────────────────────────

type Props = {
  open: boolean;
  percent: number;
  title?: string;
  doneTitle?: string; // ✅ NOVO
  message?: string;
  onClose?: () => void;
};

export default function ImportProgressToast({
  open,
  percent,
  title = "Importando planilha...",
  doneTitle = "Importação concluída!", // ✅ NOVO
  message,
  onClose,
}: Props) {
  // ...
  // trocar o texto fixo:
  // {done ? "Importação concluída!" : title}
  // por:
  // {done ? doneTitle : title}
}


// ─────────────────────────────────────────────
// 2) AnnounceActions.tsx
// ─────────────────────────────────────────────

// (a) import
import ImportProgressToast from "@/components/announce/Importprogresstoast";

// (b) novo state, junto dos outros do Bling
const [blingToastOpen, setBlingToastOpen] = useState(false);

// (c) handleExportBling completo
const handleExportBling = async () => {
  setExportingBling(true);
  setBlingProgress(0);
  setBlingToastOpen(true);
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada. Entre novamente.");

    const r = await fetch(
      `/api/announce/export?source=bling&loja=${loja}&format=xlsx`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (!r.ok || !r.body) {
      const j = await r.json().catch(() => null);
      throw new Error(j?.error || "Erro ao exportar");
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let buffer = "";
    let fileName = "bling-anuncios.xlsx";
    let mimeType = "application/octet-stream";
    let finished = false;

    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const msg = JSON.parse(line);
      if (msg.type === "progress") setBlingProgress(msg.percent);
      else if (msg.type === "chunk") chunks[msg.index] = msg.data;
      else if (msg.type === "error") throw new Error(msg.error);
      else if (msg.type === "done") {
        fileName = msg.fileName;
        mimeType = msg.mimeType;
        finished = true;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(handleLine);
    }
    if (buffer.trim()) handleLine(buffer);
    if (!finished) throw new Error("Exportação interrompida.");

    const bin = atob(chunks.join(""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setBlingProgress(100); // ✅ mostra "concluída" no toast
  } catch (e) {
    setBlingProgress(0);
    setBlingToastOpen(false); // erro: fecha o toast e avisa
    alert(e instanceof Error ? e.message : "Erro ao exportar");
  } finally {
    setExportingBling(false);
    setTimeout(() => {
      setBlingToastOpen(false);
      setBlingProgress(0);
    }, 1500);
  }
};

// (d) render — colocar logo antes do </div> final do return
<ImportProgressToast
  open={blingToastOpen}
  percent={blingProgress}
  title="Exportando planilha Bling..."
  doneTitle="Exportação concluída!"
  message={`Loja: ${loja === "pikot" ? "Pikot Shop" : "Sóbaquetas"}`}
  onClose={() => setBlingToastOpen(false)}
/>
