import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/components/AppShell";
import { OPENING_HOURS, formatBRL, formatDayLabel, sameDayRange, toIsoSlot } from "@/lib/salon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/schedule")({
  head: () => ({
    meta: [
      { title: "Agenda do salão — Naylza Reis" },
      { name: "description", content: "Gerencie a agenda das profissionais do salão." },
      { property: "og:title", content: "Agenda do salão — Naylza Reis" },
      { property: "og:description", content: "Gerencie a agenda das profissionais do salão." },
    ],
  }),
  component: AdminSchedule,
});

function AdminSchedule() {
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: loadingRole } = useIsAdmin();
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );
  const [day, setDay] = useState(days[0]!);
  const [professionalId, setProfessionalId] = useState<string>("");

  const { data: professionals } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const activeProfessional = professionalId || professionals?.[0]?.id || "";

  const { data: dayData } = useQuery({
    queryKey: ["admin-day", activeProfessional, day.toDateString()],
    enabled: Boolean(activeProfessional),
    queryFn: async () => {
      const { start, end } = sameDayRange(day);
      const [appts, blocks] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(name)")
          .eq("professional_id", activeProfessional)
          .neq("status", "cancelled")
          .gte("starts_at", start)
          .lte("starts_at", end)
          .order("starts_at"),
        supabase
          .from("blocked_slots")
          .select("*")
          .eq("professional_id", activeProfessional)
          .gte("starts_at", start)
          .lte("starts_at", end),
      ]);
      return { appointments: appts.data ?? [], blocks: blocks.data ?? [] };
    },
  });

  async function toggleBlock(time: string) {
    const iso = toIsoSlot(day, time);
    const existing = dayData?.blocks.find(
      (b) => new Date(b.starts_at).getTime() === new Date(iso).getTime(),
    );
    if (existing) {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", existing.id);
      if (error) {
        toast.error("Não foi possível liberar o horário.");
        return;
      }
      toast.success("Horário liberado.");
    } else {
      const { error } = await supabase
        .from("blocked_slots")
        .insert({ professional_id: activeProfessional, starts_at: iso });
      if (error) {
        toast.error("Não foi possível bloquear o horário.");
        return;
      }
      toast.success("Horário bloqueado.");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-day"] });
  }

  if (loadingRole) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return (
      <div className="surface-card p-6">
        <h1 className="font-display text-2xl">Área do salão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva da equipe do salão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Agenda do salão</h1>
        <p className="mt-1 text-muted-foreground">Horários do dia e bloqueios por profissional.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(professionals ?? []).map((p) => (
          <button
            key={p.id}
            onClick={() => setProfessionalId(p.id)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-sm",
              activeProfessional === p.id
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => setDay(d)}
            className={cn(
              "min-w-[92px] rounded-xl border border-border bg-card px-3 py-3 text-sm capitalize",
              d.toDateString() === day.toDateString() &&
                "bg-hero text-primary-foreground border-transparent",
            )}
          >
            {formatDayLabel(d)}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Horários</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {OPENING_HOURS.map((h) => {
            const ts = new Date(toIsoSlot(day, h)).getTime();
            const booked = dayData?.appointments.some(
              (a) => new Date(a.starts_at).getTime() === ts,
            );
            const blocked = dayData?.blocks.some((b) => new Date(b.starts_at).getTime() === ts);
            return (
              <button
                key={h}
                disabled={booked}
                onClick={() => toggleBlock(h)}
                className={cn(
                  "rounded-lg border border-border bg-card py-2.5 text-sm",
                  booked && "cursor-not-allowed bg-secondary opacity-70",
                  blocked && "bg-muted text-muted-foreground line-through",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {blocked ? <Lock className="size-3" /> : null}
                  {h}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Toque em um horário livre para bloquear ou liberar. Horários com cliente não podem ser
          bloqueados.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Agendamentos do dia</h2>
        {(dayData?.appointments ?? []).length === 0 ? (
          <p className="surface-card p-5 text-sm text-muted-foreground">
            Nenhum cliente marcado nesta data.
          </p>
        ) : (
          <ul className="space-y-3">
            {dayData?.appointments.map((a) => (
              <li key={a.id} className="surface-card flex flex-wrap items-center gap-3 p-4">
                <span className="font-display text-xl">
                  {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.services?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Cliente
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  Pago {formatBRL(a.paid_cents)} de {formatBRL(a.total_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
