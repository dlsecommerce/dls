export type CompStatus = "red" | "orange" | "green";
export type CompItem = { cost_id: string; code: string | null; product: string | null; amount: number };
export type CompAlert = { reason: string; code: string | null };
export type CompInfo = { status: CompStatus; items: CompItem[]; alerts: CompAlert[] };
