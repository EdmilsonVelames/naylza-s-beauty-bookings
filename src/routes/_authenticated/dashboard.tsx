import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTime, STATUS_LABEL } from "@/lib/salon";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Início — Salão Naylza Reis" },
      { name: "description", content: "Veja seus próximos horários e pagamentos no salão." },
      { property: "og:title", content: "Início — Salão Naylza Reis" },
      { property: "og:description", content: "Seus próximos horários e pagamentos." },
    ],
  }),
  component: Dashboard,
});

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name, price_cents, duration_min), professionals(name)")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

function Dashboard() {
  const { data, isLoading } = useAppointments();
  const now = Date.now();
  const upcoming = (data ?? []).filter(
    (a) => a.status !== "cancelled" && new Date(a.starts_at).getTime() >= now,
  );
  const next = upcoming[0];
  const recent = (data ?? [])
    .slice()
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Olá, bem-vinda</h1>
          <p className="mt-1 text-muted-foreground">Sua agenda de beleza em um só lugar.</p>
        </div>
        <Button asChild>
          <Link to="/booking">
            <Plus className="size-4" /> Novo agendamento
          </Link>
        </Button>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="bg-hero px-6 py-5 text-primary-foreground">
          <p className="text-xs uppercase tracking-widest opacity-80">Próximo agendamento</p>
          {next ? (
            <>
              <h2 className="mt-2 font-display text-3xl">{next.services?.name}</h2>
              <p className="mt-1 text-sm opacity-90">
                {formatDateTime(next.starts_at)} · com {next.professionals?.name}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm opacity-90">Você ainda não tem horários marcados.</p>
          )}
        </div>
        {next ? (
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
            <Info label="Valor total" value={formatBRL(next.total_cents)} />
            <Info label="Já pago" value={formatBRL(next.paid_cents)} />
            <Info label="Restante" value={formatBRL(next.total_cents - next.paid_cents)} />
          </div>
        ) : (
          <div className="px-6 py-5">
            <Button asChild variant="outline">
              <Link to="/booking">Agendar agora</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Agendamentos recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/appointments">Ver todos</Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : recent.length === 0 ? (
          <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <CalendarDays className="size-5" /> Nenhum agendamento ainda.
          </div>
        ) : (
          <ul className="space-y-3">
            {recent.map((a) => (
              <li key={a.id} className="surface-card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.services?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(a.starts_at)} · {a.professionals?.name}
                  </p>
                </div>
                <Badge variant={a.status === "cancelled" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </Badge>
                <span className="font-medium">{formatBRL(a.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}
