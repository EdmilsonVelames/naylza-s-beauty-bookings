import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTime, STATUS_LABEL } from "@/lib/salon";
import { useAppointments } from "./dashboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Meus agendamentos — Salão Naylza Reis" },
      { name: "description", content: "Acompanhe seus horários e o status de pagamento." },
      { property: "og:title", content: "Meus agendamentos — Salão Naylza Reis" },
      { property: "og:description", content: "Acompanhe seus horários e o status de pagamento." },
    ],
  }),
  component: Appointments,
});

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmados" },
  { value: "paid", label: "Pagos" },
  { value: "cancelled", label: "Cancelados" },
];

function Appointments() {
  const { data, isLoading } = useAppointments();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const list = (data ?? []).filter((a) => filter === "all" || a.status === filter);

  async function cancel(id: string) {
    setBusy(id);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast.error("Não foi possível cancelar.");
      return;
    }
    toast.success("Agendamento cancelado. O reembolso do sinal foi solicitado.");
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }

  async function payRest(id: string, total: number) {
    setBusy(id);
    const { error } = await supabase
      .from("appointments")
      .update({ paid_cents: total, status: "paid" })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast.error("Não foi possível concluir o pagamento.");
      return;
    }
    toast.success("Pagamento concluído. Obrigada!");
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Meus agendamentos</h1>
        <p className="mt-1 text-muted-foreground">Status de cada horário e dos pagamentos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-sm transition-colors",
              filter === f.value ? "bg-primary text-primary-foreground border-transparent" : "bg-card",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          Nenhum agendamento nesse filtro.
        </p>
      ) : (
        <ul className="space-y-4">
          {list.map((a) => {
            const remaining = a.total_cents - a.paid_cents;
            return (
              <li key={a.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{a.services?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(a.starts_at)} · {a.professionals?.name}
                    </p>
                  </div>
                  <Badge variant={a.status === "cancelled" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Cell label="Total" value={formatBRL(a.total_cents)} />
                  <Cell label="Pago" value={formatBRL(a.paid_cents)} />
                  <Cell label="Restante" value={formatBRL(Math.max(remaining, 0))} />
                </div>

                {a.status !== "cancelled" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {remaining > 0 ? (
                      <Button
                        size="sm"
                        disabled={busy === a.id}
                        onClick={() => payRest(a.id, a.total_cents)}
                      >
                        Pagar saldo restante ({formatBRL(remaining)})
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === a.id}
                      onClick={() => cancel(a.id)}
                    >
                      Cancelar agendamento
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
