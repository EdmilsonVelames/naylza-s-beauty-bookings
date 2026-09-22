import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatDateTime, readDraft, type BookingDraft } from "@/lib/salon";
import { useSalonSettings, depositFor, DEFAULT_DEPOSIT_PERCENT } from "@/hooks/useSalonSettings";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Pagamento antecipado — Salão Naylza Reis" },
      { name: "description", content: "Pague 50% do valor e confirme sua reserva." },
      { property: "og:title", content: "Pagamento antecipado — Salão Naylza Reis" },
      { property: "og:description", content: "Pague 50% do valor e confirme sua reserva." },
    ],
  }),
  component: Checkout,
});

const METHODS = [
  { value: "pix", label: "Pix" },
  { value: "credit", label: "Cartão de crédito" },
  { value: "debit", label: "Cartão de débito" },
];

function Checkout() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [method, setMethod] = useState("pix");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = readDraft();
    if (!d) {
      navigate({ to: "/booking", replace: true });
      return;
    }
    setDraft(d);
  }, [navigate]);

  if (!draft) return null;

  const deposit = Math.round(draft.priceCents / 2);

  async function pay() {
    if (!draft) return;
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        user_id: userData.user.id,
        service_id: draft.serviceId,
        professional_id: draft.professionalId,
        starts_at: draft.startsAt,
        total_cents: draft.priceCents,
        paid_cents: deposit,
        payment_method: method,
        status: "confirmed",
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error("Não foi possível confirmar o pagamento. Tente novamente.");
      return;
    }
    navigate({ to: "/confirmation", search: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl">Pagamento antecipado</h1>
        <p className="mt-1 text-muted-foreground">
          Confirme sua reserva pagando 50% agora. O restante é pago no dia do atendimento.
        </p>
      </div>

      <section className="surface-card p-6">
        <h2 className="font-display text-2xl">Resumo do agendamento</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Serviço" value={draft.serviceName} />
          <Row label="Profissional" value={draft.professionalName} />
          <Row label="Data e hora" value={formatDateTime(draft.startsAt)} />
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</p>
          <p className="mt-1 font-display text-3xl">{formatBRL(draft.priceCents)}</p>
        </div>
        <div className="surface-card bg-hero p-5 text-primary-foreground">
          <p className="text-xs uppercase tracking-wide opacity-80">Antecipado (50%)</p>
          <p className="mt-1 font-display text-3xl">{formatBRL(deposit)}</p>
        </div>
      </div>

      <section className="surface-card space-y-3 p-6">
        <h2 className="font-display text-2xl">Método de pagamento</h2>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="w-full sm:w-auto" disabled={loading} onClick={pay}>
          Pagar 50% ({formatBRL(deposit)})
        </Button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
