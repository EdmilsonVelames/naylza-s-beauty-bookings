import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/components/AppShell";
import { useSalonSettings, depositFor } from "@/hooks/useSalonSettings";
import { buildSlots, formatBRL, minutesOf } from "@/lib/salon";

export const Route = createFileRoute("/_authenticated/admin/salon")({
  head: () => ({
    meta: [
      { title: "Administração do salão — Salão Naylza Reis" },
      {
        name: "description",
        content: "Gerencie profissionais, salas e valores do Salão Naylza Reis.",
      },
      { property: "og:title", content: "Administração do salão — Salão Naylza Reis" },
      {
        property: "og:description",
        content: "Gerencie profissionais, salas e valores do Salão Naylza Reis.",
      },
    ],
  }),
  component: AdminSalon,
});

function AdminSalon() {
  const { data: isAdmin, isLoading } = useIsAdmin();

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
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
        <h1 className="font-display text-4xl">Administração do salão</h1>
        <p className="mt-1 text-muted-foreground">
          Profissionais, salas e valores em um só lugar.
        </p>
      </div>

      <Tabs defaultValue="pros">
        <TabsList>
          <TabsTrigger value="pros">Profissionais</TabsTrigger>
          <TabsTrigger value="rooms">Salas</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="values">Valores</TabsTrigger>
        </TabsList>
        <TabsContent value="pros" className="mt-6">
          <Professionals />
        </TabsContent>
        <TabsContent value="rooms" className="mt-6">
          <Rooms />
        </TabsContent>
        <TabsContent value="hours" className="mt-6">
          <Hours />
        </TabsContent>
        <TabsContent value="values" className="mt-6">
          <Values />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Professionals() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");

  const { data } = useQuery({
    queryKey: ["professionals-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["professionals-admin"] });
    queryClient.invalidateQueries({ queryKey: ["professionals"] });
  }

  async function add() {
    if (!name.trim()) {
      toast.error("Informe o nome da profissional.");
      return;
    }
    const { error } = await supabase
      .from("professionals")
      .insert({ name: name.trim(), specialty: specialty.trim() });
    if (error) {
      toast.error("Não foi possível adicionar.");
      return;
    }
    setName("");
    setSpecialty("");
    toast.success("Profissional adicionada.");
    refresh();
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("professionals").update({ active }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    if (error) {
      toast.error("Esta profissional já tem agendamentos. Desative-a em vez de remover.");
      return;
    }
    toast.success("Profissional removida.");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nome</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-spec">Especialidade</Label>
          <Input
            id="p-spec"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Colorista & Cortes"
          />
        </div>
        <Button onClick={add}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>

      <ul className="space-y-3">
        {(data ?? []).map((p) => (
          <li key={p.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.specialty}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} />
              {p.active ? "Atendendo" : "Inativa"}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Rooms() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data } = useQuery({
    queryKey: ["rooms-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["rooms-admin"] });
  }

  async function add() {
    if (!name.trim()) {
      toast.error("Informe o nome da sala.");
      return;
    }
    const { error } = await supabase
      .from("rooms")
      .insert({ name: name.trim(), description: description.trim() });
    if (error) {
      toast.error("Não foi possível adicionar a sala.");
      return;
    }
    setName("");
    setDescription("");
    toast.success("Sala adicionada.");
    refresh();
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("rooms").update({ active }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar a sala.");
      return;
    }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover a sala.");
      return;
    }
    toast.success("Sala removida.");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="r-name">Nome da sala</Label>
          <Input
            id="r-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sala 1"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-desc">Descrição</Label>
          <Input
            id="r-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Coloração e tratamentos"
          />
        </div>
        <Button onClick={add}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>

      {(data ?? []).length === 0 ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          Nenhuma sala cadastrada ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((r) => (
            <li key={r.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} />
                {r.active ? "Disponível" : "Indisponível"}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Hours() {
  const queryClient = useQueryClient();
  const { data: settings } = useSalonSettings();
  const [form, setForm] = useState({
    open_time: "09:00",
    close_time: "19:00",
    slot_minutes: "30",
    break_start: "12:00",
    break_end: "13:00",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      open_time: settings.open_time,
      close_time: settings.close_time,
      slot_minutes: String(settings.slot_minutes),
      break_start: settings.break_start,
      break_end: settings.break_end,
    });
  }, [settings]);

  const preview = buildSlots({
    open_time: form.open_time || "09:00",
    close_time: form.close_time || "19:00",
    slot_minutes: Number(form.slot_minutes) || 30,
    break_start: form.break_start,
    break_end: form.break_end,
  });

  async function save() {
    const step = Number(form.slot_minutes);
    if (!Number.isFinite(step) || step < 5 || step > 240) {
      toast.error("O intervalo entre horários deve ficar entre 5 e 240 minutos.");
      return;
    }
    if (minutesOf(form.close_time) <= minutesOf(form.open_time)) {
      toast.error("O horário de fechamento precisa ser depois da abertura.");
      return;
    }
    const { error } = await supabase
      .from("salon_settings")
      .update({
        open_time: form.open_time,
        close_time: form.close_time,
        slot_minutes: Math.round(step),
        break_start: form.break_start,
        break_end: form.break_end,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) {
      toast.error("Não foi possível salvar os horários.");
      return;
    }
    toast.success("Horários de atendimento atualizados.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
    queryClient.invalidateQueries({ queryKey: ["slots"] });
  }

  return (
    <div className="space-y-4">
      <section className="surface-card space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl">Horários de atendimento</h2>
          <p className="text-sm text-muted-foreground">
            Define quais horários aparecem para as clientes agendarem.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="open">Abre às</Label>
            <Input
              id="open"
              type="time"
              value={form.open_time}
              onChange={(e) => setForm({ ...form, open_time: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close">Fecha às</Label>
            <Input
              id="close"
              type="time"
              value={form.close_time}
              onChange={(e) => setForm({ ...form, close_time: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="step">Intervalo (min)</Label>
            <Input
              id="step"
              value={form.slot_minutes}
              onChange={(e) => setForm({ ...form, slot_minutes: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bs">Pausa começa</Label>
            <Input
              id="bs"
              type="time"
              value={form.break_start}
              onChange={(e) => setForm({ ...form, break_start: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="be">Pausa termina</Label>
            <Input
              id="be"
              type="time"
              value={form.break_end}
              onChange={(e) => setForm({ ...form, break_end: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={save}>Salvar horários</Button>
      </section>

      <section className="surface-card space-y-3 p-5">
        <h3 className="font-display text-xl">Como vai aparecer ({preview.length} horários)</h3>
        <div className="flex flex-wrap gap-2">
          {preview.map((h) => (
            <span key={h} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              {h}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Cada serviço ocupa o tempo da sua duração, então horários que não cabem ficam
          indisponíveis automaticamente.
        </p>
      </section>
    </div>
  );
}

function Values() {
  const queryClient = useQueryClient();
  const { data: settings } = useSalonSettings();
  const [percent, setPercent] = useState("50");
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setPercent(String(settings.deposit_percent));
  }, [settings]);

  const { data: services } = useQuery({
    queryKey: ["services-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  async function savePercent() {
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Informe um percentual entre 0 e 100.");
      return;
    }
    const { error } = await supabase
      .from("salon_settings")
      .update({ deposit_percent: Math.round(value), updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) {
      toast.error("Não foi possível salvar o percentual.");
      return;
    }
    toast.success("Percentual do sinal atualizado.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
  }

  async function savePrice(id: string, current: number) {
    const raw = prices[id];
    const value = raw === undefined ? current / 100 : Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const { error } = await supabase
      .from("services")
      .update({ price_cents: Math.round(value * 100) })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar o preço.");
      return;
    }
    toast.success("Preço atualizado.");
    queryClient.invalidateQueries({ queryKey: ["services-admin"] });
    queryClient.invalidateQueries({ queryKey: ["services"] });
  }

  const pct = Number(percent) || 0;

  return (
    <div className="space-y-6">
      <section className="surface-card space-y-3 p-5">
        <h2 className="font-display text-2xl">Sinal do agendamento</h2>
        <p className="text-sm text-muted-foreground">
          Percentual cobrado antecipadamente para confirmar a reserva.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pct">Percentual (%)</Label>
            <Input
              id="pct"
              className="w-32"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>
          <Button onClick={savePercent}>Salvar</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Exemplo: um serviço de {formatBRL(20000)} tem sinal de{" "}
          {formatBRL(depositFor(20000, pct))}.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Preços dos serviços</h2>
        <ul className="space-y-3">
          {(services ?? []).map((s) => (
            <li key={s.id} className="surface-card flex flex-wrap items-end gap-4 p-4">
              <div className="flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  {s.duration_min} min · sinal de {formatBRL(depositFor(s.price_cents, pct))}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`price-${s.id}`}>Preço (R$)</Label>
                <Input
                  id={`price-${s.id}`}
                  className="w-32"
                  value={prices[s.id] ?? (s.price_cents / 100).toFixed(2)}
                  onChange={(e) => setPrices({ ...prices, [s.id]: e.target.value })}
                />
              </div>
              <Button variant="outline" onClick={() => savePrice(s.id, s.price_cents)}>
                Salvar
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
