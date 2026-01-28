import type { MiniUser, UiStatus } from "./types";

// ✅ mapeia banco -> UI
export const normalizeStatus = (
  s: MiniUser["status"] | null | undefined
): UiStatus => {
  switch (s) {
    case "disponivel":
    case "online":
      return "online";
    case "ausente":
      return "ausente";
    case "ocupado":
      return "ocupado";
    case "invisivel":
      return "invisivel";
    default:
      return "offline";
  }
};

// ===== Helpers UI (copiados 1:1 do arquivo original)

export const getStatusColor = (status: UiStatus) => {
  switch (status) {
    case "online":
      return "#10b981";
    case "ausente":
      return "#f59e0b";
    case "ocupado":
      return "#ef4444";
    case "invisivel":
      return "#6b7280";
    default:
      return "#6b7280";
  }
};

export const getStatusText = (status: UiStatus) => {
  switch (status) {
    case "online":
      return "Disponível";
    case "ausente":
      return "Ausente";
    case "ocupado":
      return "Ocupado";
    case "invisivel":
      return "Invisível";
    default:
      return "Offline";
  }
};

export const getInitials = (name?: string) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "??";
