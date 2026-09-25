import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsAdmin } from "@/components/AppShell";
import { formatBRL } from "@/lib/salon";

export const Route = createFileRoute("/_authenticated/admin/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — Salão Naylza Reis" },
      {
        name: "description",
        content: "Faturamento por período, serviços mais vendidos, profissionais e clientes.",
      },
      { property: "og:title", content: "Caixa — Salão Naylza Reis" },
      {
        property: "og:description",
        content: "Faturamento por período, serviços mais vendidos, profissionais e clientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Caixa,
});

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  account_money: "Saldo Mercado Pago",
  bolbradesco: "Boleto",
  debelo: "Débito",
  master: "Cartão Mastercard",
  visa: "Cartão Visa",
  elo: "Cartão Elo",
  amex: "Cartão Amex",
  mp_card: "Cartão Mercado Pago",
  mercadopago: "Mercado Pago",
  dinheiro: "Dinheiro (no salão)",
  maquininha_credito: "Maquininha — crédito",
  maquininha_debito: "Maquininha — débito",
  pix_salao: "Pix (no salão)",
};

type Row = { key: string; label: string; count: number; cents: number };

function group<T>(items: T[], key: (i: T) => string, label: (i: T) => string, cents: (i: T) => number) {
  const m = new Map<string, Row>();
  for (const i of items) {
    const k = key(i);
    const r = m.get(k) ?? { key: k, label: label(i), count: 0, cents: 0 };
    r.count += 1;
    r.cents += cents(i);
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => b.cents - a.cents || b.count - a.count);
}

function Caixa() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const today = new Date();
  const [from, setFrom] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(ymd(today));

  const { data, isFetching } = useQuery({
    queryKey: ["caixa", from, to],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const start = new Date(`${from}T00:00:00`).toISOString();
      const end = new Date(`${to}T23:59:59`).toISOString();
      const [appts, pays, profiles] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, user_id, starts_at, total_cents, paid_cents, status, services(name), professionals(name)")
          .gte("starts_at", start)
          .lte("starts_at", end)
          .neq("status", "cancelled"),
        supabase
          .from("payments")
          .select("amount_cents, payment_method, status, updated_at")
          .eq("status", "approved")
          .gte("updated_at", start)
          .lte("updated_at", end),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (appts.error) throw appts.error;
      if (pays.error) throw pays.error;
      return { appts: appts.data, pays: pays.data, profiles: profiles.data ?? [] };
    },
  });

  const report = useMemo(() => {
    if (!data) return null;
    const paidAppts = data.appts.filter((a) => a.paid_cents > 0);
    const received = data.pays.reduce((s, p) => s + p.amount_cents, 0);
    const booked = paidAppts.reduce((s, a) => s + a.total_cents, 0);
    const toReceive = paidAppts.reduce((s, a) => s + (a.total_cents - a.paid_cents), 0);
    const names = new Map(data.profiles.map((p) => [p.id, p.full_name || p.email || "Cliente"]));
    return {
      received,
      booked,
      toReceive,
      count: paidAppts.length,
      services: group(paidAppts, (a) => a.services?.name ?? "—", (a) => a.services?.name ?? "—", (a) => a.total_cents),
      pros: group(
        paidAppts,
        (a) => a.professionals?.name ?? "—",
        (a) => a.professionals?.name ?? "—",
        (a) => a.total_cents,
      ),
      methods: group(
        data.pays,
        (p) => p.payment_method || "mercadopago",
        (p) => METHOD_LABEL[p.payment_method] ?? p.payment_method ?? "Outro",
        (p) => p.amount_cents,
      ),
      clients: group(
        paidAppts,
        (a) => a.user_id,
        (a) => names.get(a.user_id) ?? "Cliente",
        (a) => a.total_cents,
      ).sort((a, b) => b.count - a.count || b.cents - a.cents),
    };
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) {
    return (
      <div className="surface-card p-6">
        <h1 className="font-display text-2xl">Área do salão</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta área é exclusiva da equipe do salão.</p>
      </div>
    );
  }

  function preset(days: number | "month") {
    const now = new Date();
    if (days === "month") setFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
    else setFrom(ymd(new Date(now.getTime() - days * 86400000)));
    setTo(ymd(now));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Caixa</h1>
        <p className="mt-1 text-muted-foreground">Resumo financeiro do salão por período.</p>
      </div>

      <div className="surface-card flex flex-wrap items-end gap-3 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => preset(0)}>Hoje</Button>
        <Button variant="outline" size="sm" onClick={() => preset(7)}>7 dias</Button>
        <Button variant="outline" size="sm" onClick={() => preset("month")}>Este mês</Button>
        <Button variant="outline" size="sm" onClick={() => preset(90)}>90 dias</Button>
      </div>

      <ManualPayment />

      {!report ? (
        <p className="text-sm text-muted-foreground">{isFetching ? "Carregando…" : "Sem dados."}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Recebido no período" value={formatBRL(report.received)} />
            <Stat label="Valor dos atendimentos" value={formatBRL(report.booked)} />
            <Stat label="A receber (saldos)" value={formatBRL(report.toReceive)} />
            <Stat label="Atendimentos" value={String(report.count)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Ranking title="Serviços mais vendidos" rows={report.services} />
            <Ranking title="Profissionais" rows={report.pros} />
            <Ranking title="Formas de pagamento" rows={report.methods} unit="pagamento" />
            <Ranking
              title="Clientes recorrentes"
              rows={report.clients.filter((c) => c.count > 1)}
              empty="Nenhuma cliente voltou mais de uma vez neste período."
            />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function Ranking({
  title,
  rows,
  unit = "atendimento",
  empty = "Nada neste período.",
}: {
  title: string;
  rows: Row[];
  unit?: string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.cents));
  return (
    <section className="surface-card space-y-3 p-5">
      <h2 className="font-display text-xl">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">
                  {r.count} {unit}
                  {r.count > 1 ? "s" : ""} · {formatBRL(r.cents)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(r.cents / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const MANUAL_METHODS = ["dinheiro", "maquininha_credito", "maquininha_debito", "pix_salao"] as const;

function ManualPayment() {
  const qc = useQueryClient();
  const [apptId, setApptId] = useState("");
  const [method, setMethod] = useState<string>("dinheiro");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: open = [] } = useQuery({
    queryKey: ["caixa-open"],
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("id, user_id, starts_at, total_cents, paid_cents, services(name)")
        .neq("status", "cancelled")
        .gte("starts_at", since)
        .order("starts_at");
      if (error) throw error;
      const rows = (data ?? []).filter((a) => a.paid_cents < a.total_cents);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email");
      const names = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email || "Cliente"]));
      return rows.map((a) => ({ ...a, client: names.get(a.user_id) ?? "Cliente" }));
    },
  });

  const sel = open.find((a) => a.id === apptId);
  const remaining = sel ? sel.total_cents - sel.paid_cents : 0;

  function pick(id: string) {
    setApptId(id);
    const a = open.find((x) => x.id === id);
    setAmount(a ? ((a.total_cents - a.paid_cents) / 100).toFixed(2).replace(".", ",") : "");
  }

  async function save(): Promise<void> {
    const cents = Math.round(Number(amount.replace(/\./g, "").replace(",", ".")) * 100);
    if (!sel) { toast.error("Escolha o atendimento."); return; }
    if (!cents || cents <= 0 || cents > remaining) { toast.error(`Valor deve ser até ${formatBRL(remaining)}.`); return; }
    setSaving(true);
    const { error } = await supabase.rpc("register_manual_payment", {
      _appointment_id: sel.id,
      _amount_cents: cents,
      _method: method,
    });
    setSaving(false);
    if (error) { toast.error("Não foi possível registrar o pagamento."); return; }
    toast.success("Pagamento registrado no caixa.");
    setApptId("");
    setAmount("");
    qc.invalidateQueries({ queryKey: ["caixa-open"] });
    qc.invalidateQueries({ queryKey: ["caixa"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-xl">Registrar pagamento no salão</h2>
        <p className="text-sm text-muted-foreground">Para valores recebidos em dinheiro, maquininha ou Pix direto no salão.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="mp-appt">Atendimento</Label>
          <select id="mp-appt" className={selectCls} value={apptId} onChange={(e) => pick(e.target.value)}>
            <option value="">{open.length ? "Escolha…" : "Nenhum atendimento com saldo em aberto"}</option>
            {open.map((a) => (
              <option key={a.id} value={a.id}>
                {new Date(a.starts_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {" · "}{a.client} · {a.services?.name ?? "Serviço"} · falta {formatBRL(a.total_cents - a.paid_cents)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp-method">Forma</Label>
          <select id="mp-method" className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            {MANUAL_METHODS.map((m) => (
              <option key={m} value={m}>{METHOD_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp-amount">Valor (R$)</Label>
          <Input id="mp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <Button onClick={save} disabled={saving || !sel}>{saving ? "Salvando…" : "Registrar"}</Button>
      </div>
    </section>
  );
}
