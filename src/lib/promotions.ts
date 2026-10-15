import type { Database } from "@/integrations/supabase/types";

export type Promotion = Database["public"]["Tables"]["promotions"]["Row"];

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Data (AAAA-MM-DD), dia da semana e hora (HH:MM) no horário de Brasília. */
function localParts(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { date: `${g("year")}-${g("month")}-${g("day")}`, weekday: wd, time: `${g("hour").replace("24", "00")}:${g("minute")}` };
}

export function promoApplies(p: Promotion, serviceId: string, startsAt: string) {
  if (!p.active) return false;
  if (p.service_ids.length && !p.service_ids.includes(serviceId)) return false;
  const { date, weekday, time } = localParts(startsAt);
  if (p.starts_on && date < p.starts_on) return false;
  if (p.ends_on && date > p.ends_on) return false;
  if (p.weekdays.length && !p.weekdays.includes(weekday)) return false;
  if (p.start_time && time < p.start_time) return false;
  if (p.end_time && time >= p.end_time) return false;
  return true;
}

/** A promoção ainda pode valer em algum dia (para mostrar no Início e na lista de serviços). */
export function promoCurrent(p: Promotion, now = new Date().toISOString()) {
  if (!p.active) return false;
  const { date } = localParts(now);
  return !p.ends_on || date <= p.ends_on;
}

export function discountedPrice(p: Promotion, priceCents: number) {
  if (p.discount_type === "percent") return Math.max(0, Math.round(priceCents * (1 - Math.min(100, p.discount_value) / 100)));
  if (p.discount_type === "fixed") return Math.max(0, priceCents - p.discount_value);
  return Math.min(priceCents, p.discount_value);
}

/** Melhor preço para o serviço no horário escolhido. */
export function bestPrice(promos: Promotion[] | null | undefined, serviceId: string, priceCents: number, startsAt?: string) {
  let best = { price: priceCents, promo: null as Promotion | null };
  for (const p of promos ?? []) {
    const ok = startsAt ? promoApplies(p, serviceId, startsAt) : promoCurrent(p) && (!p.service_ids.length || p.service_ids.includes(serviceId));
    if (!ok) continue;
    const v = discountedPrice(p, priceCents);
    if (v < best.price) best = { price: v, promo: p };
  }
  return best;
}

export function describeDiscount(p: Promotion) {
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (p.discount_type === "percent") return `${p.discount_value}% de desconto`;
  if (p.discount_type === "fixed") return `${brl(p.discount_value)} de desconto`;
  return `Por apenas ${brl(p.discount_value)}`;
}

export function describeWhen(p: Promotion) {
  const parts: string[] = [];
  const br = (d: string) => d.split("-").reverse().join("/");
  if (p.starts_on && p.ends_on) parts.push(`de ${br(p.starts_on)} a ${br(p.ends_on)}`);
  else if (p.ends_on) parts.push(`até ${br(p.ends_on)}`);
  else if (p.starts_on) parts.push(`a partir de ${br(p.starts_on)}`);
  if (p.weekdays.length) parts.push(p.weekdays.slice().sort().map((w) => WEEKDAYS[w]).join(", "));
  if (p.start_time || p.end_time) parts.push(`${p.start_time || "abertura"}–${p.end_time || "fechamento"}`);
  return parts.join(" · ");
}
