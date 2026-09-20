import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { clearDraft, formatBRL, formatDateTime } from "@/lib/salon";

type Search = { id?: string };

export const Route = createFileRoute("/_authenticated/confirmation")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    id: typeof search['id'] === "string" ? search['id'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Agendamento confirmado — Salão Naylza Reis" },
      { name: "description", content: "Sua reserva foi confirmada com o sinal de 50%." },
      { property: "og:title", content: "Agendamento confirmado — Salão Naylza Reis" },
      { property: "og:description", content: "Sua reserva foi confirmada com o sinal de 50%." },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
  const { id } = Route.useSearch();

  useEffect(() => {
    clearDraft();
  }, []);

  const { data } = useQuery({
    queryKey: ["appointment", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name), professionals(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-10" />
      </div>
      <h1 className="mt-6 font-display text-4xl">Agendamento confirmado!</h1>
      <p className="mt-2 text-muted-foreground">
        Recebemos seu pagamento antecipado. Te esperamos no salão.
      </p>

      {data ? (
        <div className="surface-card mt-8 space-y-3 p-6 text-left">
          <Row label="Serviço" value={data.services?.name ?? ""} />
          <Row label="Profissional" value={data.professionals?.name ?? ""} />
          <Row label="Data e hora" value={formatDateTime(data.starts_at)} />
          <Row label="Valor pago (50%)" value={formatBRL(data.paid_cents)} />
          <Row
            label="Valor restante"
            value={formatBRL(data.total_cents - data.paid_cents)}
          />
        </div>
      ) : null}

      <Button asChild className="mt-8">
        <Link to="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
