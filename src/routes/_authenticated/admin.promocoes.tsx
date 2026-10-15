import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Copy, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsAdmin } from "@/components/AppShell";
import { formatBRL } from "@/lib/salon";
import { WEEKDAYS, describeDiscount, describeWhen, discountedPrice, type Promotion } from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/promocoes")({
  head: () => ({
    meta: [
      { title: "Promoções — Salão Naylza Reis" },
      { name: "description", content: "Crie e edite promoções dos serviços do salão." },
      { property: "og:title", content: "Promoções — Salão Naylza Reis" },
      { property: "og:description", content: "Crie e edite promoções dos serviços do salão." },
    ],
  }),
  component: Promocoes,
});

type Form = {
  id?: string;
  title: string;
  description: string;
  badge_text: string;
  discount_type: "percent" | "fixed" | "price";
  value: string;
  service_ids: string[];
  starts_on: string;
  ends_on: string;
  weekdays: number[];
  start_time: string;
  end_time: string;
  show_banner: boolean;
  active: boolean;
};

const empty: Form = {
  title: "",
  description: "",
  badge_text: "Promoção",
  discount_type: "percent",
  value: "10",
  service_ids: [],
  starts_on: "",
  ends_on: "",
  weekdays: [],
  start_time: "",
  end_time: "",
  show_banner: true,
  active: true,
};

function toForm(p: Promotion, copy = false): Form {
  return {
    id: copy ? undefined : p.id,
    title: copy ? `${p.title} (cópia)` : p.title,
    description: p.description,
    badge_text: p.badge_text,
    discount_type: p.discount_type as Form["discount_type"],
    value: p.discount_type === "percent" ? String(p.discount_value) : (p.discount_value / 100).toFixed(2).replace(".", ","),
    service_ids: p.service_ids,
    starts_on: p.starts_on ?? "",
    ends_on: p.ends_on ?? "",
    weekdays: p.weekdays,
    start_time: p.start_time ?? "",
    end_time: p.end_time ?? "",
    show_banner: p.show_banner,
    active: copy ? false : p.active,
  };
}

function Promocoes() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: promos } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: services } = useQuery({
    queryKey: ["promo-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name, price_cents").order("position").order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return null;
  if (!isAdmin) return <p className="text-muted-foreground">Apenas a administração pode criar promoções.</p>;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    qc.invalidateQueries({ queryKey: ["promotions"] });
  };

  async function save() {
    if (!form) return;
    if (!form.title.trim()) return toast.error("Dê um nome para a promoção.");
    const raw = Number(form.value.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(raw) || raw < 0) return toast.error("Informe um valor de desconto válido.");
    if (form.discount_type === "percent" && raw > 100) return toast.error("A porcentagem vai até 100%.");
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on)
      return toast.error("A data final precisa ser depois da inicial.");
    const row = {
      title: form.title.trim(),
      description: form.description.trim(),
      badge_text: form.badge_text.trim() || "Promoção",
      discount_type: form.discount_type,
      discount_value: form.discount_type === "percent" ? Math.round(raw) : Math.round(raw * 100),
      service_ids: form.service_ids,
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
      weekdays: form.weekdays,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      show_banner: form.show_banner,
      active: form.active,
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from("promotions").update(row).eq("id", form.id)
      : await supabase.from("promotions").insert(row);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar a promoção.");
    toast.success("Promoção salva.");
    setForm(null);
    refresh();
  }

  async function toggle(p: Promotion, active: boolean) {
    const { error } = await supabase.from("promotions").update({ active }).eq("id", p.id);
    if (error) return toast.error("Não foi possível alterar.");
    refresh();
  }

  async function remove(p: Promotion) {
    if (!confirm(`Excluir a promoção "${p.title}"?`)) return;
    const { error } = await supabase.from("promotions").delete().eq("id", p.id);
    if (error) return toast.error("Não foi possível excluir.");
    toast.success("Promoção excluída.");
    refresh();
  }

  const svcName = (id: string) => services?.find((s) => s.id === id)?.name ?? "—";
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Promoções</h1>
          <p className="mt-1 text-muted-foreground">
            O desconto aparece no agendamento e já entra no valor cobrado.
          </p>
        </div>
        <Button onClick={() => setForm({ ...empty })}>
          <Plus className="size-4" /> Nova promoção
        </Button>
      </div>

      {!promos?.length ? (
        <div className="surface-card p-8 text-center text-muted-foreground">
          Nenhuma promoção criada ainda.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {promos.map((p) => (
            <div key={p.id} className={`surface-card space-y-3 p-5 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    <Tag className="size-3" /> {p.badge_text}
                  </span>
                  <p className="mt-2 font-display text-2xl">{p.title}</p>
                  <p className="text-sm font-medium text-primary">{describeDiscount(p)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {p.active ? "Ativa" : "Pausada"}
                  <Switch checked={p.active} onCheckedChange={(v) => toggle(p, v)} />
                </div>
              </div>
              {p.description ? <p className="text-sm text-muted-foreground">{p.description}</p> : null}
              <p className="text-xs text-muted-foreground">
                Serviços: {p.service_ids.length ? p.service_ids.map(svcName).join(", ") : "todos"}
              </p>
              {describeWhen(p) ? <p className="text-xs text-muted-foreground">Quando: {describeWhen(p)}</p> : null}
              <p className="text-xs text-muted-foreground">
                {p.show_banner ? "Aparece em destaque no Início das clientes" : "Sem destaque no Início"}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setForm(toForm(p))}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setForm(toForm(p, true))}>
                  <Copy className="size-4" /> Duplicar
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(p)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{form?.id ? "Editar promoção" : "Nova promoção"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome da promoção</Label>
                  <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Semana da escova" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Texto que as clientes vão ver" />
                </div>
                <div className="space-y-1.5">
                  <Label>Selo</Label>
                  <Input value={form.badge_text} maxLength={24} onChange={(e) => set({ badge_text: e.target.value })} placeholder="Promoção" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de desconto</Label>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["percent", "Porcentagem (%)"],
                    ["fixed", "Valor em reais (R$ a menos)"],
                    ["price", "Preço fixo promocional"],
                  ] as const).map(([k, l]) => (
                    <Button key={k} type="button" size="sm" variant={form.discount_type === k ? "default" : "outline"} onClick={() => set({ discount_type: k })}>
                      {l}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 sm:w-60">
                  <span className="text-sm text-muted-foreground">{form.discount_type === "percent" ? "%" : "R$"}</span>
                  <Input inputMode="decimal" value={form.value} onChange={(e) => set({ value: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Serviços na promoção</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => set({ service_ids: [] })}>
                    Todos os serviços
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.service_ids.length ? `${form.service_ids.length} selecionado(s)` : "Nenhum marcado = vale para todos."}
                </p>
                <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
                  {(services ?? []).map((s) => {
                    const on = form.service_ids.includes(s.id);
                    const raw = Number(form.value.replace(/\./g, "").replace(",", "."));
                    const v = Number.isFinite(raw) ? (form.discount_type === "percent" ? Math.round(raw) : Math.round(raw * 100)) : 0;
                    const preview = discountedPrice({ discount_type: form.discount_type, discount_value: v } as Promotion, s.price_cents);
                    return (
                      <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => set({ service_ids: on ? form.service_ids.filter((x) => x !== s.id) : [...form.service_ids, s.id] })}
                        />
                        <span className="flex-1">{s.name}</span>
                        <span className="text-xs text-muted-foreground line-through">{formatBRL(s.price_cents)}</span>
                        <span className="text-xs font-medium text-primary">{formatBRL(preview)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Começa em (opcional)</Label>
                  <Input type="date" value={form.starts_on} onChange={(e) => set({ starts_on: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Termina em (opcional)</Label>
                  <Input type="date" value={form.ends_on} onChange={(e) => set({ ends_on: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>A partir das (opcional)</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Até as (opcional)</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} />
                </div>
              </div>
              <p className="-mt-3 text-xs text-muted-foreground">Datas e horas valem para o dia do atendimento.</p>

              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w, i) => {
                    const on = form.weekdays.includes(i);
                    return (
                      <Button key={w} type="button" size="sm" variant={on ? "default" : "outline"} onClick={() => set({ weekdays: on ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i] })}>
                        {w}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Nenhum marcado = todos os dias.</p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  Mostrar em destaque no Início das clientes
                  <Switch checked={form.show_banner} onCheckedChange={(v) => set({ show_banner: v })} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  Promoção ativa
                  <Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} />
                </label>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar promoção"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
