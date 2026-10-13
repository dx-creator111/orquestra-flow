const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const rel = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export const formatBRL = (cents: number) => brl.format((cents ?? 0) / 100);
export const formatDate = (d: string | Date | null | undefined) => (d ? dt.format(new Date(d)) : "—");
export function formatRelative(d: string | Date | null | undefined) {
  if (!d) return "—";
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rel.format(Math.round(diff), "second");
  if (abs < 3600) return rel.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rel.format(Math.round(diff / 3600), "hour");
  return rel.format(Math.round(diff / 86400), "day");
}
export const E164 = /^\+[1-9]\d{7,14}$/;