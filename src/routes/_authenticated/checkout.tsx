import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startDepositCheckout } from "@/lib/payments.functions";
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

function Checkout() {
  const navigate = useNavigate();
  const startDeposit = useServerFn(startDepositCheckout);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: settings } = useSalonSettings();
  const percent = settings?.deposit_percent ?? DEFAULT_DEPOSIT_PERCENT;

  useEffect(() => {
    const d = readDraft();
    if (!d) {
      navigate({ to: "/booking", replace: true });
      return;
    }
    setDraft(d);
  }, [navigate]);

  if (!draft) return null;

  const deposit = depositFor(draft.priceCents, percent);

  async function pay() {
    if (!draft) return;
    setLoading(true);
    try {
      const res = await startDeposit({
        data: {
          serviceId: draft.serviceId,
          professionalId: draft.professionalId,
          startsAt: draft.startsAt,
        },
      });
      window.location.href = res.url;
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("reservado")
          ? "Este horário acabou de ser reservado. Escolha outro."
          : "Não foi possível abrir o pagamento. Tente novamente.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl">Pagamento antecipado</h1>
        <p className="mt-1 text-muted-foreground">
          Confirme sua reserva pagando {percent}% agora. O restante é pago no dia do atendimento.
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
          <p className="text-xs uppercase tracking-wide opacity-80">Antecipado ({percent}%)</p>
          <p className="mt-1 font-display text-3xl">{formatBRL(deposit)}</p>
        </div>
      </div>

      <section className="surface-card space-y-3 p-6">
        <h2 className="font-display text-2xl">Método de pagamento</h2>
        <p className="text-sm text-muted-foreground">
          O pagamento é feito pelo Mercado Pago, com Pix, cartão de crédito ou débito. Você será
          levada para uma página segura e volta para a confirmação em seguida.
        </p>
        <Button className="w-full sm:w-auto" disabled={loading} onClick={pay}>
          {loading ? "Abrindo pagamento…" : `Pagar ${percent}% (${formatBRL(deposit)})`}
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
