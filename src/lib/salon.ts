export const SALON_NAME = "Naylza Reis";

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export const OPENING_HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export function toIsoSlot(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

export function sameDayRange(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export type BookingDraft = {
  serviceId: string;
  serviceName: string;
  priceCents: number;
  professionalId: string;
  professionalName: string;
  startsAt: string;
};

const KEY = "naylza.booking.draft";

export function saveDraft(draft: BookingDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function readDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as BookingDraft) : null;
}

export function clearDraft() {
  sessionStorage.removeItem(KEY);
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  confirmed: "Confirmado (50% pago)",
  paid: "Totalmente pago",
  cancelled: "Cancelado",
};
