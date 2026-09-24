import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PENDING_HOLD_MIN,
  buildSlots,
  formatBRL,
  formatDayLabel,
  minutesOf,
  overlaps,
  sameDayRange,
  saveDraft,
  toIsoSlot,
  type Busy,
} from "@/lib/salon";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({
    meta: [
      { title: "Novo agendamento — Salão Naylza Reis" },
      { name: "description", content: "Escolha serviço, profissional, data e horário." },
      { property: "og:title", content: "Novo agendamento — Salão Naylza Reis" },
      { property: "og:description", content: "Escolha serviço, profissional, data e horário." },
    ],
  }),
  component: Booking,
});

function nextDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function Booking() {
  const navigate = useNavigate();
  const days = useMemo(() => nextDays(14), []);
  const [serviceId, setServiceId] = useState<string>("");
  const [professionalId, setProfessionalId] = useState<string>("");
  const [day, setDay] = useState<Date>(days[0]!);
  const [time, setTime] = useState<string>("");

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: taken } = useQuery({
    queryKey: ["slots", professionalId, day.toDateString()],
    enabled: Boolean(professionalId),
    queryFn: async () => {
      const { start, end } = sameDayRange(day);
      const [appts, blocks] = await Promise.all([
        supabase
          .from("appointments")
          .select("starts_at, status")
          .eq("professional_id", professionalId)
          .neq("status", "cancelled")
          .gte("starts_at", start)
          .lte("starts_at", end),
        supabase
          .from("blocked_slots")
          .select("starts_at")
          .eq("professional_id", professionalId)
          .gte("starts_at", start)
          .lte("starts_at", end),
      ]);
      return [...(appts.data ?? []), ...(blocks.data ?? [])].map((r) =>
        new Date(r.starts_at).getTime(),
      );
    },
  });

  const service = services?.find((s) => s.id === serviceId);
  const professional = professionals?.find((p) => p.id === professionalId);
  const ready = Boolean(service && professional && time);

  function continueToCheckout() {
    if (!service || !professional || !time) return;
    saveDraft({
      serviceId: service.id,
      serviceName: service.name,
      priceCents: service.price_cents,
      professionalId: professional.id,
      professionalName: professional.name,
      startsAt: toIsoSlot(day, time),
    });
    navigate({ to: "/checkout" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Novo agendamento</h1>
        <p className="mt-1 text-muted-foreground">
          Reserve seu horário confirmando 50% do valor.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">1. Serviço</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(services ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={cn(
                "surface-card p-4 text-left transition-all hover:shadow-[var(--shadow-lift)]",
                serviceId === s.id && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                <span className="whitespace-nowrap font-display text-lg">
                  {formatBRL(s.price_cents)}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> {s.duration_min} min
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">2. Profissional</h2>
        <Select value={professionalId} onValueChange={setProfessionalId}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Escolha a profissional" />
          </SelectTrigger>
          <SelectContent>
            {(professionals ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">3. Data</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => (
            <button
              key={d.toISOString()}
              onClick={() => {
                setDay(d);
                setTime("");
              }}
              className={cn(
                "min-w-[92px] rounded-xl border border-border bg-card px-3 py-3 text-sm capitalize transition-colors",
                d.toDateString() === day.toDateString() &&
                  "bg-hero text-primary-foreground border-transparent",
              )}
            >
              {formatDayLabel(d)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">4. Horário</h2>
        {!professionalId ? (
          <p className="text-sm text-muted-foreground">Escolha uma profissional para ver os horários.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {OPENING_HOURS.map((h) => {
              const iso = toIsoSlot(day, h);
              const ts = new Date(iso).getTime();
              const busy = (taken ?? []).includes(ts) || ts < Date.now();
              return (
                <button
                  key={h}
                  disabled={busy}
                  onClick={() => setTime(h)}
                  className={cn(
                    "rounded-lg border border-border bg-card py-2.5 text-sm transition-colors",
                    busy && "cursor-not-allowed opacity-40 line-through",
                    time === h && "bg-primary text-primary-foreground border-transparent",
                  )}
                >
                  {h}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="surface-card sticky bottom-20 flex flex-wrap items-center justify-between gap-4 p-4 md:bottom-4">
        <div>
          <p className="text-sm text-muted-foreground">Sinal de 50%</p>
          <p className="font-display text-2xl">
            {service ? formatBRL(Math.round(service.price_cents / 2)) : "—"}
          </p>
        </div>
        <Button disabled={!ready} onClick={continueToCheckout}>
          Continuar para pagamento
        </Button>
      </div>
    </div>
  );
}
