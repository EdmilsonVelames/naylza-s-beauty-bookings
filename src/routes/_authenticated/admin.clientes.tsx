import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsStaff } from "@/components/AppShell";

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
  const { isStaff, isLoading } = useIsStaff();
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
        visits: [],
        services: {},
      });
    }
    for (const a of data?.appts ?? []) {
      const guest = a.guest_name.trim();
      const key = guest ? `guest:${guest.toLowerCase()}` : a.user_id;
      let c = map.get(key);
      if (!c) {
        c = { key, userId: null, name: guest, phone: a.guest_phone, visits: [], services: {} };
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
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
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
      <Input
        placeholder="Buscar por nome ou telefone"
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
  onSaved,
}: {
  client: Client;
  note?: { phone: string; notes: string };
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState(note?.phone || client.phone);
  const [notes, setNotes] = useState(note?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const last = client.visits.length ? Math.max(...client.visits) : null;
  const fav = Object.entries(client.services).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  async function save() {
    setBusy(true);
    const ops = [
      supabase
        .from("client_notes")
        .upsert({ client_key: client.key, phone, notes, updated_at: new Date().toISOString() }),
    ];
    if (client.userId) ops.push(supabase.from("profiles").update({ phone }).eq("id", client.userId) as never);
    const res = await Promise.all(ops);
    setBusy(false);
    if (res.some((r) => r.error)) return toast.error("Não foi possível salvar.");
    toast.success("Cliente atualizada.");
    onSaved();
  }

  return (
    <div className="surface-card grid gap-3 p-4 md:grid-cols-[1fr_1fr]">
      <div className="space-y-1 text-sm">
        <p className="font-display text-xl">
          {client.name || "Sem nome"}
          {!client.userId ? <span className="ml-2 text-xs text-muted-foreground">(sem cadastro)</span> : null}
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
        <Textarea placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <Button size="sm" disabled={busy} onClick={save}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
