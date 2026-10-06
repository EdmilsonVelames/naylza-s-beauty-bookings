import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayKey } from "@/lib/salon";
import { cn } from "@/lib/utils";

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEK_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function WeeklyOffEditor({ professionalId }: { professionalId: string }) {
  const queryClient = useQueryClient();
  const { data: daysOff } = useDaysOff(professionalId);
  async function toggle(w: number) {
    const on = daysOff?.weekdays.has(w);
    const { error } = on
      ? await supabase.from("professional_weekly_off").delete().eq("professional_id", professionalId).eq("weekday", w)
      : await supabase.from("professional_weekly_off").insert({ professional_id: professionalId, weekday: w });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(on ? `Folga de toda ${WEEK_FULL[w]} removida.` : `Toda ${WEEK_FULL[w]} agora é folga.`);
    queryClient.invalidateQueries({ queryKey: ["days-off"] });
  }
  return (
    <section className="surface-card space-y-3 p-4">
      <div>
        <h3 className="font-display text-xl">Folga fixa na semana</h3>
        <p className="text-sm text-muted-foreground">Toque no dia da semana para deixar todas as datas dele como folga.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {WEEK.map((w, i) => (
          <Button key={w} size="sm" variant={daysOff?.weekdays.has(i) ? "default" : "outline"} onClick={() => toggle(i)}>
            {w}
          </Button>
        ))}
      </div>
    </section>
  );
}

export function useDaysOff(professionalId: string) {
  return useQuery({
    queryKey: ["days-off", professionalId],
    enabled: Boolean(professionalId),
    queryFn: async () => {
      const [days, weekly] = await Promise.all([
        supabase.from("professional_days_off").select("day").eq("professional_id", professionalId),
        supabase.from("professional_weekly_off").select("weekday").eq("professional_id", professionalId),
      ]);
      if (days.error) throw days.error;
      if (weekly.error) throw weekly.error;
      const dates = new Set(days.data.map((d) => d.day));
      const weekdays = new Set(weekly.data.map((w) => w.weekday));
      return {
        dates,
        weekdays,
        /** yyyy-mm-dd is a day off (single date or weekly). */
        has: (k: string) => {
          if (dates.has(k)) return true;
          const [y, m, d] = k.split("-").map(Number);
          return weekdays.has(new Date(y!, m! - 1, d!).getDay());
        },
      };
    },
  });
}

export function MonthCalendar({
  professionalId,
  day,
  onSelect,
}: {
  professionalId: string;
  day: Date;
  onSelect: (d: Date) => void;
}) {
  const [month, setMonth] = useState(() => new Date(day.getFullYear(), day.getMonth(), 1));
  const { data: daysOff } = useDaysOff(professionalId);
  const from = month;
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const { data: counts } = useQuery({
    queryKey: ["month-counts", professionalId, from.toISOString()],
    enabled: Boolean(professionalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("starts_at")
        .eq("professional_id", professionalId)
        .neq("status", "cancelled")
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString());
      if (error) throw error;
      const m = new Map<string, number>();
      for (const a of data) {
        const k = dayKey(new Date(a.starts_at));
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    },
  });

  const cells = useMemo(() => {
    const first = month.getDay();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ];
  }, [month]);

  const today = dayKey(new Date());

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-display text-xl capitalize">
          {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEK.map((w) => (
          <span key={w} className="py-1">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const k = dayKey(d);
          const off = daysOff?.has(k);
          const n = counts?.get(k) ?? 0;
          const selected = k === dayKey(day);
          return (
            <button
              key={k}
              onClick={() => onSelect(d)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition-colors hover:bg-secondary",
                k === today && "font-semibold",
                off && "bg-muted text-muted-foreground line-through",
                selected && "bg-primary text-primary-foreground border-transparent no-underline",
              )}
            >
              {d.getDate()}
              {off ? (
                <span className="text-[10px] no-underline">folga</span>
              ) : n ? (
                <span className="text-[10px]">{n} {n === 1 ? "cliente" : "clientes"}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DayOffToggle({ professionalId, day }: { professionalId: string; day: Date }) {
  const queryClient = useQueryClient();
  const { data: daysOff } = useDaysOff(professionalId);
  const k = dayKey(day);
  const off = daysOff?.dates.has(k) ?? false;
  const weeklyOff = daysOff?.weekdays.has(day.getDay()) ?? false;
  if (weeklyOff && !off) {
    return <p className="text-sm text-muted-foreground">Folga fixa toda {WEEK_FULL[day.getDay()]}.</p>;
  }
  async function toggle() {
    const { error } = off
      ? await supabase.from("professional_days_off").delete().eq("professional_id", professionalId).eq("day", k)
      : await supabase.from("professional_days_off").insert({ professional_id: professionalId, day: k });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(off ? "Folga removida." : "Dia marcado como folga. Ninguém consegue agendar com ela nesse dia.");
    queryClient.invalidateQueries({ queryKey: ["days-off"] });
  }
  return (
    <Button variant={off ? "default" : "outline"} onClick={toggle}>
      {off ? "Remover folga deste dia" : "Marcar este dia como folga"}
    </Button>
  );
}

export function ProHoursEditor({
  professional,
}: {
  professional: { id: string; name: string; open_time: string | null; close_time: string | null; break_start: string | null; break_end: string | null };
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState("");
  const [close, setClose] = useState("");
  const [bs, setBs] = useState("");
  const [be, setBe] = useState("");
  useEffect(() => {
    setOpen(professional.open_time ?? "");
    setClose(professional.close_time ?? "");
    setBs(professional.break_start ?? "");
    setBe(professional.break_end ?? "");
  }, [professional]);

  async function save(reset = false) {
    if (!reset && (!open || !close || open >= close)) {
      toast.error("Informe o início e o fim do expediente.");
      return;
    }
    const { error } = await supabase.rpc("set_professional_hours", {
      _professional_id: professional.id,
      _open: reset ? "" : open,
      _close: reset ? "" : close,
      _bstart: reset ? "" : bs,
      _bend: reset ? "" : be,
    });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(reset ? "Voltou a usar o horário do salão." : "Horário de trabalho salvo.");
    queryClient.invalidateQueries({ queryKey: ["professionals"] });
  }

  const own = Boolean(professional.open_time && professional.close_time);
  return (
    <section className="surface-card space-y-3 p-4">
      <div>
        <h3 className="font-display text-xl">Horário de trabalho — {professional.name}</h3>
        <p className="text-sm text-muted-foreground">
          {own ? "Usando horário próprio." : "Usando o horário do salão."} Mudar aqui não altera o horário do salão.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1"><Label>Começa</Label><Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} /></div>
        <div className="space-y-1"><Label>Termina</Label><Input type="time" value={close} onChange={(e) => setClose(e.target.value)} /></div>
        <div className="space-y-1"><Label>Pausa início</Label><Input type="time" value={bs} onChange={(e) => setBs(e.target.value)} /></div>
        <div className="space-y-1"><Label>Pausa fim</Label><Input type="time" value={be} onChange={(e) => setBe(e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save()}>Salvar horário</Button>
        {own ? <Button variant="outline" onClick={() => save(true)}>Usar horário do salão</Button> : null}
      </div>
    </section>
  );
}
