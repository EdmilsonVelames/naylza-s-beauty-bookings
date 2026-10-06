import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsStaff } from "@/components/AppShell";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useServerFn } from "@tanstack/react-start";
import { PasswordInput } from "@/components/PasswordInput";
import { adminDeleteClient, adminUpdateClient } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Salão Naylza Reis" },
      { name: "description", content: "Lista de clientes com atendimentos, preferências e observações." },
      { property: "og:title", content: "Clientes — Salão Naylza Reis" },
      { property: "og:description", content: "Lista de clientes com atendimentos e observações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clientes,
});

type Client = {
  key: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string;
  visits: number[];
  services: Record<string, number>;
};

function frequencyLabel(visits: number[]) {
  if (visits.length < 2) return "—";
  const sorted = [...visits].sort((a, b) => a - b);
  const days = (sorted[sorted.length - 1]! - sorted[0]!) / 86_400_000 / (sorted.length - 1);
  return `a cada ${Math.max(1, Math.round(days))} dias`;
}

function Clientes() {
  const { isStaff, isAdmin, isLoading } = useIsStaff();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["clientes"],
    enabled: isStaff,
    queryFn: async () => {
      const [appts, profiles, notes] = await Promise.all([
        supabase
          .from("appointments")
          .select("user_id, guest_name, guest_phone, starts_at, status, services(name)")
          .neq("status", "cancelled"),
        supabase.from("profiles").select("id, full_name, phone, email"),
        supabase.from("client_notes").select("*"),
      ]);
      return { appts: appts.data ?? [], profiles: profiles.data ?? [], notes: notes.data ?? [] };
    },
  });

  const clients = useMemo(() => {
    const map = new Map<string, Client>();
    for (const p of data?.profiles ?? []) {
      map.set(p.id, {
        key: p.id,
        userId: p.id,
        name: p.full_name || p.email,
        phone: p.phone,
        email: p.email,
        visits: [],
        services: {},
      });
    }
    for (const a of data?.appts ?? []) {
      const guest = a.guest_name.trim();
      const key = guest ? `guest:${guest.toLowerCase()}` : a.user_id;
      let c = map.get(key);
      if (!c) {
        c = { key, userId: null, name: guest, phone: a.guest_phone, email: "", visits: [], services: {} };
        map.set(key, c);
      }
      if (guest && a.guest_phone) c.phone = a.guest_phone;
      const t = new Date(a.starts_at).getTime();
      if (t <= Date.now()) c.visits.push(t);
      const svc = a.services?.name ?? "";
      if (svc) c.services[svc] = (c.services[svc] ?? 0) + 1;
    }
    const q = search.toLowerCase();
    return [...map.values()]
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search]);

  const notesByKey = useMemo(
    () => new Map((data?.notes ?? []).map((n) => [n.client_key, n])),
    [data],
  );

  if (isLoading) return null;
  if (!isStaff) {
    return <p className="text-muted-foreground">Área do salão — exclusiva da equipe.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Clientes</h1>
        <p className="mt-1 text-muted-foreground">Histórico, preferências e observações.</p>
      </div>
      <DepositSettings />
      <Input
        placeholder="Buscar por nome, telefone ou e-mail"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80"
      />
      <div className="grid gap-3">
        {clients.map((c) => (
          <ClientCard
            key={c.key}
            client={c}
            note={notesByKey.get(c.key)}
            isAdmin={isAdmin}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["clientes"] })}
          />
        ))}
        {clients.length === 0 ? <p className="text-muted-foreground">Nenhuma cliente encontrada.</p> : null}
      </div>
    </div>
  );
}

function ClientCard({
  client,
  note,
  isAdmin,
  onSaved,
}: {
  client: Client;
  isAdmin: boolean;
  note?: { phone: string; notes: string } | undefined;
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState(note?.phone || client.phone);
  const [notes, setNotes] = useState(note?.notes ?? "");
  const [email, setEmail] = useState(client.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const updateClient = useServerFn(adminUpdateClient);
  const deleteClient = useServerFn(adminDeleteClient);
  const last = client.visits.length ? Math.max(...client.visits) : null;
  const fav = Object.entries(client.services).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  async function save() {
    setBusy(true);
    const ops = [
      supabase
        .from("client_notes")
        .upsert({ client_key: client.key, phone, notes, updated_at: new Date().toISOString() }),
    ];
    if (client.userId && !isAdmin) ops.push(supabase.from("profiles").update({ phone }).eq("id", client.userId) as never);
    const res = await Promise.all(ops);
    if (res.some((r) => r.error)) { setBusy(false); toast.error("Não foi possível salvar."); return; }
    if (client.userId && isAdmin) {
      if (password && password.length < 6) { setBusy(false); toast.error("A senha precisa ter pelo menos 6 caracteres."); return; }
      try {
        await updateClient({
          data: {
            userId: client.userId,
            phone,
            ...(email.trim() && email.trim() !== client.email ? { email: email.trim() } : {}),
            ...(password ? { password } : {}),
          },
        });
        setPassword("");
      } catch (e) {
        setBusy(false);
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
        return;
      }
    }
    setBusy(false);
    toast.success("Cliente atualizada.");
    onSaved();
  }

  async function remove() {
    if (!client.userId) return;
    if (!window.confirm(`Excluir o cadastro de ${client.name}? Os agendamentos e pagamentos dela também serão apagados. Isso não pode ser desfeito.`)) return;
    setBusy(true);
    try {
      await deleteClient({ data: { userId: client.userId } });
      toast.success("Cadastro excluído.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card grid gap-3 p-4 md:grid-cols-[1fr_1fr]">
      <div className="space-y-1 text-sm">
        <p className="font-display text-xl">
          {client.name || "Sem nome"}
          {!client.userId ? <span className="ml-2 text-xs text-muted-foreground">(sem cadastro)</span> : null}
        </p>
        {client.userId ? <ClientDepositSelect userId={client.userId} /> : null}
        <p>
          <span className="text-muted-foreground">Telefone: </span>
          {client.phone || note?.phone || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">E-mail: </span>
          {client.email || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Último atendimento: </span>
          {last ? new Date(last).toLocaleDateString("pt-BR") : "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Serviço preferido: </span>
          {fav}
        </p>
        <p>
          <span className="text-muted-foreground">Frequência de retorno: </span>
          {frequencyLabel(client.visits)} ({client.visits.length} atendimentos)
        </p>
      </div>
      <div className="space-y-2">
        <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {isAdmin && client.userId ? (
          <>
            <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput placeholder="Nova senha (deixe vazio para não trocar)" value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        ) : null}
        <Textarea placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={save}>
            Salvar
          </Button>
          {isAdmin && client.userId ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={remove}>
              Excluir cadastro
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function useDepositOverrides() {
  return useQuery({
    queryKey: ["deposit-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_deposit_overrides").select("user_id, required");
      if (error) throw error;
      return new Map(data.map((o) => [o.user_id, o.required]));
    },
  });
}

function DepositSettings() {
  const queryClient = useQueryClient();
  const { data: settings } = useSalonSettings();
  const on = settings?.deposit_required ?? true;
  async function toggle() {
    const { error } = await supabase.rpc("set_deposit_required", { _value: !on });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(!on ? "Pagamento antecipado ativado para todas." : "Pagamento antecipado desativado para todas.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
  }
  return (
    <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h2 className="font-display text-xl">Pagamento antecipado de {settings?.deposit_percent ?? 50}%</h2>
        <p className="text-sm text-muted-foreground">
          {on
            ? "Ativado: as clientes pagam o sinal para confirmar o horário."
            : "Desativado: as clientes agendam sem pagar antes."}{" "}
          Abaixo, em cada cliente, dá para mudar só para ela.
        </p>
      </div>
      <Button variant={on ? "default" : "outline"} onClick={toggle}>
        {on ? "Desativar para todas" : "Ativar para todas"}
      </Button>
    </section>
  );
}

function ClientDepositSelect({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data: overrides } = useDepositOverrides();
  const current = overrides?.has(userId) ? (overrides.get(userId) ? "on" : "off") : "default";
  async function change(v: string) {
    const { error } =
      v === "default"
        ? await supabase.from("client_deposit_overrides").delete().eq("user_id", userId)
        : await supabase
            .from("client_deposit_overrides")
            .upsert({ user_id: userId, required: v === "on", updated_at: new Date().toISOString() });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Pagamento antecipado atualizado para esta cliente.");
    queryClient.invalidateQueries({ queryKey: ["deposit-overrides"] });
  }
  return (
    <label className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-muted-foreground">Sinal antecipado:</span>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        <option value="default">Igual a todas</option>
        <option value="on">Exigir</option>
        <option value="off">Não exigir</option>
      </select>
    </label>
  );
}
