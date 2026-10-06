import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { THEME_PRESETS, themeVars } from "@/lib/theme";
import { toast } from "sonner";
import { Check, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { SalonImage, uploadSalonImage } from "@/lib/images";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/components/AppShell";
import { useSalonSettings, depositFor } from "@/hooks/useSalonSettings";
import { buildSlots, formatBRL, minutesOf } from "@/lib/salon";
import { LOGO_ICONS } from "@/lib/logo-icons";
import { cn } from "@/lib/utils";

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
          <TabsTrigger value="look">Aparência</TabsTrigger>
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
        <TabsContent value="look" className="mt-6">
          <ThemeColors />
          <div className="mt-6"><Look /></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Professionals() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpec, setEditSpec] = useState("");

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

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      toast.error("Informe o nome da profissional.");
      return;
    }
    const { error } = await supabase
      .from("professionals")
      .update({ name: editName.trim(), specialty: editSpec.trim() })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setEditId(null);
    toast.success("Profissional atualizada.");
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
        {(data ?? []).map((p) =>
          editId === p.id ? (
            <li key={p.id} className="surface-card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor={`en-${p.id}`}>Nome</Label>
                <Input id={`en-${p.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`es-${p.id}`}>Especialidade</Label>
                <Input id={`es-${p.id}`} value={editSpec} onChange={(e) => setEditSpec(e.target.value)} />
              </div>
              <Button onClick={() => saveEdit(p.id)}>
                <Check className="size-4" /> Salvar
              </Button>
              <Button variant="ghost" onClick={() => setEditId(null)}>
                <X className="size-4" /> Cancelar
              </Button>
            </li>
          ) : (
            <li key={p.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.specialty}</p>
                <AccountLink professionalId={p.id} userId={p.user_id} onSaved={refresh} />
                <ServicePicker professionalId={p.id} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} />
                {p.active ? "Atendendo" : "Inativa"}
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar"
                onClick={() => {
                  setEditId(p.id);
                  setEditName(p.name);
                  setEditSpec(p.specialty ?? "");
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => remove(p.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ),
        )}
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
    allow_past_closing: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      open_time: settings.open_time,
      close_time: settings.close_time,
      slot_minutes: String(settings.slot_minutes),
      break_start: settings.break_start,
      break_end: settings.break_end,
      allow_past_closing: settings.allow_past_closing,
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
        allow_past_closing: form.allow_past_closing,
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
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={form.allow_past_closing}
            onChange={(e) => setForm({ ...form, allow_past_closing: e.target.checked })}
          />
          <span>
            Liberar horários mesmo que o serviço termine depois do fechamento
            <span className="block text-xs text-muted-foreground">
              Desmarcado: só aparecem horários em que o serviço acaba antes de fechar.
            </span>
          </span>
        </label>
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

function AccountLink({
  professionalId,
  userId,
  onSaved,
}: {
  professionalId: string;
  userId: string | null;
  onSaved: () => void;
}) {
  const { data: accounts } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  async function change(value: string) {
    const { error } = await supabase
      .from("professionals")
      .update({ user_id: value || null })
      .eq("id", professionalId);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Essa conta já está ligada a outra profissional."
          : "Não foi possível salvar o acesso.",
      );
      return;
    }
    toast.success(value ? "Acesso de profissional liberado." : "Acesso removido.");
    onSaved();
  }

  return (
    <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      Conta de acesso:
      <select
        value={userId ?? ""}
        onChange={(e) => change(e.target.value)}
        className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
      >
        <option value="">Sem acesso</option>
        {(accounts ?? []).map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name || a.email} {a.full_name ? `(${a.email})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function ServicePicker({ professionalId }: { professionalId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: services } = useQuery({
    queryKey: ["services-all-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category_id")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: cats } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("position")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: links } = useQuery({
    queryKey: ["professional-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_services").select("*");
      if (error) throw error;
      return data;
    },
  });
  const mine = new Set(
    (links ?? []).filter((l) => l.professional_id === professionalId).map((l) => l.service_id),
  );

  const groups = [
    ...(cats ?? []).map((c) => ({ id: c.id, name: c.name })),
    { id: "none", name: "Outros" },
  ]
    .map((g) => ({
      ...g,
      items: (services ?? []).filter((s) =>
        g.id === "none" ? !s.category_id : s.category_id === g.id,
      ),
    }))
    .filter((g) => g.items.length > 0);

  async function setMany(serviceIds: string[], on: boolean) {
    const ids = serviceIds.filter((id) => mine.has(id) !== on);
    if (!ids.length) return;
    const { error } = on
      ? await supabase
          .from("professional_services")
          .insert(ids.map((service_id) => ({ professional_id: professionalId, service_id })))
      : await supabase
          .from("professional_services")
          .delete()
          .eq("professional_id", professionalId)
          .in("service_id", ids);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["professional-services"] });
  }

  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <button type="button" className="underline" onClick={() => setOpen((v) => !v)}>
        Procedimentos que faz: {mine.size === 0 ? "todos (nenhum selecionado)" : mine.size}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          {groups.map((g) => {
            const all = g.items.every((s) => mine.has(s.id));
            return (
              <div key={g.id} className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={all}
                    onChange={(e) => setMany(g.items.map((s) => s.id), e.target.checked)}
                  />
                  {g.name} — selecionar todos
                </label>
                <div className="mt-2 grid gap-1 pl-5 sm:grid-cols-2">
                  {g.items.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={mine.has(s.id)}
                        onChange={(e) => setMany([s.id], e.target.checked)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Look() {
  const queryClient = useQueryClient();
  const { data } = useSalonSettings();
  const current = data?.logo_icon ?? "scissors";
  async function pick(key: string) {
    const { error } = await supabase.from("salon_settings").upsert({ id: true, logo_icon: key, logo_image: "" });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Ícone trocado.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
  }
  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-2xl">Ícone do salão</h2>
        <p className="text-sm text-muted-foreground">
          Aparece ao lado do nome do salão na tela de entrada e no topo do app.
        </p>
      </div>
      <LogoImage />
      <p className="text-sm text-muted-foreground">Ou escolha um dos ícones prontos:</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Object.entries(LOGO_ICONS).map(([key, { label, Icon }]) => (
          <button
            key={key}
            onClick={() => pick(key)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border border-border p-3 text-xs transition-colors hover:bg-secondary",
              current === key && "ring-2 ring-primary",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-hero text-primary-foreground">
              <Icon className="size-5" />
            </span>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function LogoImage() {
  const queryClient = useQueryClient();
  const { data } = useSalonSettings();
  const [busy, setBusy] = useState(false);
  const path = data?.logo_image ?? "";

  async function save(next: string) {
    const { error } = await supabase.from("salon_settings").upsert({ id: true, logo_image: next });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(next ? "Imagem do salão salva." : "Imagem removida. Voltou a usar o ícone.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Escolha uma imagem de até 5 MB.");
      return;
    }
    setBusy(true);
    try {
      await save(await uploadSalonImage(file, "logo"));
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
      <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-hero text-primary-foreground">
        {path ? <SalonImage path={path} alt="Logo do salão" className="size-full rounded-full" /> : <ImagePlus className="size-6" />}
      </span>
      <div className="space-y-2">
        <p className="font-medium">Imagem própria (logo)</p>
        <p className="text-xs text-muted-foreground">Imagem quadrada, 512 × 512 px (até 5 MB). Ela fica dentro de um círculo.</p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
            {busy ? "Enviando…" : path ? "Trocar imagem" : "Adicionar imagem"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {path ? (
            <Button size="sm" variant="outline" onClick={() => save("")}>
              <Trash2 className="size-4" /> Remover
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ThemeColors() {
  const queryClient = useQueryClient();
  const { data: settings } = useSalonSettings();
  const [primary, setPrimary] = useState("");
  const [accent, setAccent] = useState("");
  useEffect(() => {
    if (!settings) return;
    setPrimary(settings.theme_primary);
    setAccent(settings.theme_accent);
  }, [settings]);

  async function save() {
    const { error } = await supabase
      .from("salon_settings")
      .update({ theme_primary: primary, theme_accent: accent, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) {
      toast.error("Não foi possível salvar as cores.");
      return;
    }
    toast.success("Cores do site atualizadas.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
  }

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-2xl">Cores do site</h2>
        <p className="text-sm text-muted-foreground">Escolha uma combinação pronta ou suas próprias cores. A prévia mostra como fica antes de salvar.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {THEME_PRESETS.map((p) => (
          <Button key={p.name} size="sm" variant="outline" onClick={() => { setPrimary(p.primary); setAccent(p.accent); }}>
            <span className="mr-1 inline-block size-3 rounded-full border border-border" style={{ background: p.primary || "var(--primary)" }} />
            {p.name}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          Cor principal
          <input type="color" value={primary || "#8a2f3c"} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Cor de destaque
          <input type="color" value={accent || "#e6c27a"} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
        </label>
      </div>
      <div className="rounded-xl border border-border p-4" style={themeVars(primary, accent) as React.CSSProperties}>
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Prévia</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-hero p-4 text-primary-foreground">
            <p className="font-display text-2xl">Salão Naylza Reis</p>
            <p className="text-sm opacity-80">Beleza com hora marcada</p>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            <p className="font-medium">Manicure e Pedicure</p>
            <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">Destaque</span>
            <div><Button size="sm">Agendar</Button></div>
          </div>
        </div>
      </div>
      <Button onClick={save}>Salvar cores</Button>
    </section>
  );
}
