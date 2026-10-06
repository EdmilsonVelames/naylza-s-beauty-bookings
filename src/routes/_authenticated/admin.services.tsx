import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Pencil, Plus, Shapes, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SalonImage, uploadSalonImage } from "@/lib/images";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsAdmin } from "@/components/AppShell";
import { formatBRL } from "@/lib/salon";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({
    meta: [
      { title: "Gerenciar serviços — Salão Naylza Reis" },
      { name: "description", content: "Cadastre serviços, preços e durações do salão." },
      { property: "og:title", content: "Gerenciar serviços — Salão Naylza Reis" },
      { property: "og:description", content: "Cadastre serviços, preços e durações do salão." },
    ],
  }),
  component: AdminServices,
});

type Category = string;

type FormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  category: Category;
  image: string;
};

const EMPTY: FormState = {
  name: "",
  description: "",
  price: "",
  duration: "60",
  category: "",
  image: "",
};

function AdminServices() {
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: loadingRole } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formatsFor, setFormatsFor] = useState<{ id: string; name: string } | null>(null);

  const { data: services } = useQuery({
    queryKey: ["services-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
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
  const CATEGORIES = (cats ?? []).map((c) => ({ value: c.id, label: c.name, hidden: c.hidden }));

  async function save() {
    const payload = {
      name: form.name,
      description: form.description,
      price_cents: Math.round(Number(form.price.replace(",", ".")) * 100) || 0,
      duration_min: Number(form.duration) || 60,
      category_id: form.category || null,
      image_url: form.image,
    };
    const res = form.id
      ? await supabase.from("services").update(payload).eq("id", form.id)
      : await supabase.from("services").insert(payload);
    if (res.error) {
      toast.error("Não foi possível salvar o serviço.");
      return;
    }
    toast.success("Serviço salvo.");
    setOpen(false);
    setForm(EMPTY);
    queryClient.invalidateQueries({ queryKey: ["services-admin"] });
    queryClient.invalidateQueries({ queryKey: ["services"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error("Este serviço já tem agendamentos e não pode ser removido.");
      return;
    }
    toast.success("Serviço removido.");
    queryClient.invalidateQueries({ queryKey: ["services-admin"] });
  }

  if (loadingRole) return <p className="text-sm text-muted-foreground">Carregando…</p>;
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Serviços</h1>
          <p className="mt-1 text-muted-foreground">Preços e durações oferecidos pelo salão.</p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...EMPTY, category: CATEGORIES[0]?.value ?? "" });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo serviço
        </Button>
      </div>

      <CategoryManager />

      {CATEGORIES.map((cat) => {
        const list = (services ?? []).filter((s) => s.category_id === cat.value);
        return (
          <section key={cat.value} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">
                {cat.label}
                {cat.hidden ? <span className="ml-2 align-middle text-sm text-muted-foreground">(oculta)</span> : null}
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setForm({ ...EMPTY, category: cat.value });
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            <div className="surface-card overflow-hidden">
              {list.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Nenhum serviço de {cat.label.toLowerCase()} cadastrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-sm text-muted-foreground">{s.description}</p>
                        </TableCell>
                        <TableCell>{s.duration_min} min</TableCell>
                        <TableCell>{formatBRL(s.price_cents)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Formatos"
                              title="Formatos"
                              onClick={() => setFormatsFor({ id: s.id, name: s.name })}
                            >
                              <Shapes className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Editar"
                              onClick={() => {
                                setForm({
                                  id: s.id,
                                  name: s.name,
                                  description: s.description,
                                  price: (s.price_cents / 100).toFixed(2),
                                  duration: String(s.duration_min),
                                  category: s.category_id ?? "",
                                  image: s.image_url ?? "",
                                });
                                setOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Remover"
                              onClick={() => remove(s.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
        );
      })}

      <Dialog open={Boolean(formatsFor)} onOpenChange={(o) => !o && setFormatsFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Formatos — {formatsFor?.name}</DialogTitle>
          </DialogHeader>
          {formatsFor ? <FormatManager serviceId={formatsFor.id} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    size="sm"
                    variant={form.category === c.value ? "default" : "outline"}
                    onClick={() => setForm({ ...form, category: c.value })}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Foto (opcional)</Label>
              <ImageUpload
                path={form.image}
                prefix="services"
                hint="Horizontal, 1200 × 900 pixels, até 5 MB."
                onUploaded={(p) => setForm((f) => ({ ...f, image: p }))}
                className="h-16 w-20 rounded-md"
              />
              {form.image ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, image: "" })}>
                  Remover foto
                </Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nome</Label>
              <Input
                id="s-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-desc">Descrição</Label>
              <Input
                id="s-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-price">Preço (R$)</Label>
                <Input
                  id="s-price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="120,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-dur">Duração (min)</Label>
                <Input
                  id="s-dur"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
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

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["service-categories"] });
    queryClient.invalidateQueries({ queryKey: ["services-admin"] });
  }

  async function add() {
    if (!newName.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    const { error } = await supabase
      .from("service_categories")
      .insert({ name: newName.trim(), position: (cats?.length ?? 0) + 1 });
    if (error) {
      toast.error("Não foi possível adicionar a categoria.");
      return;
    }
    setNewName("");
    toast.success("Categoria adicionada.");
    refresh();
  }

  async function rename(id: string) {
    const name = edits[id]?.trim();
    if (!name) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    const { error } = await supabase.from("service_categories").update({ name }).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setEdits((e) => {
      const n = { ...e };
      delete n[id];
      return n;
    });
    toast.success("Categoria atualizada.");
    refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const list = [...(cats ?? [])];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j]!, list[index]!];
    const results = await Promise.all(
      list.map((c, i) => supabase.from("service_categories").update({ position: i + 1 }).eq("id", c.id)),
    );
    if (results.some((r) => r.error)) {
      toast.error("Não foi possível mudar a ordem.");
      return;
    }
    refresh();
    queryClient.invalidateQueries({ queryKey: ["service-categories"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover a categoria.");
      return;
    }
    toast.success("Categoria removida. Os serviços dela ficaram sem categoria.");
    refresh();
  }

  return (
    <section className="surface-card space-y-4 p-5">
      <h2 className="font-display text-2xl">Categorias</h2>
      <ul className="space-y-2">
        {(cats ?? []).map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col">
              <Button size="icon" variant="ghost" className="size-6" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                <ChevronUp className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="size-6" aria-label="Descer" disabled={i === (cats?.length ?? 0) - 1} onClick={() => move(i, 1)}>
                <ChevronDown className="size-4" />
              </Button>
            </div>
            <Input
              className="max-w-xs"
              aria-label="Nome da categoria"
              value={edits[c.id] ?? c.name}
              onChange={(e) => setEdits({ ...edits, [c.id]: e.target.value })}
            />
            {edits[c.id] !== undefined && edits[c.id] !== c.name && (
              <Button size="sm" onClick={() => rename(c.id)}>
                Salvar
              </Button>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={!c.hidden}
                onCheckedChange={async (v) => {
                  const { error } = await supabase.from("service_categories").update({ hidden: !v }).eq("id", c.id);
                  if (error) { toast.error("Não foi possível salvar."); return; }
                  toast.success(v ? "Categoria visível para as clientes." : "Categoria oculta. Os serviços dela não aparecem no agendamento.");
                  refresh();
                }}
              />
              {c.hidden ? "Oculta" : "Visível"}
            </label>
            <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => remove(c.id)}>
              <Trash2 className="size-4" />
            </Button>
            <div className="w-full">
              <ImageUpload
                path={c.image_url}
                prefix="categories"
                hint="Foto horizontal, 1200 × 900 px (4:3, até 5 MB)."
                className="h-16 w-[86px] rounded-md"
                onUploaded={async (p) => {
                  const { error } = await supabase.from("service_categories").update({ image_url: p }).eq("id", c.id);
                  if (error) { toast.error("Não foi possível salvar a foto."); return; }
                  toast.success("Foto salva.");
                  refresh();
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Nova categoria"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" /> Adicionar categoria
        </Button>
      </div>
    </section>
  );
}

function ImageUpload({
  path,
  prefix,
  hint,
  onUploaded,
  className,
}: {
  path: string;
  prefix: string;
  hint: string;
  onUploaded: (path: string) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto precisa ter até 5 MB.");
      return;
    }
    setBusy(true);
    try {
      onUploaded(await uploadSalonImage(file, prefix));
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3">
      <SalonImage path={path} alt="Foto" className={className ?? "size-16 rounded-md"} />
      <div className="space-y-1">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
          <ImagePlus className="size-4" /> {busy ? "Enviando…" : path ? "Trocar foto" : "Adicionar foto"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function FormatManager({ serviceId }: { serviceId: string }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { data: all } = useQuery({
    queryKey: ["service-formats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_formats")
        .select("*")
        .order("position")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const list = (all ?? []).filter((f) => f.service_id === serviceId);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["service-formats"] });

  async function update(id: string, patch: { name?: string; image_url?: string }) {
    const { error } = await supabase.from("service_formats").update(patch).eq("id", id);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Formato salvo.");
    setEdits((e) => {
      const n = { ...e };
      delete n[id];
      return n;
    });
    refresh();
  }
  async function add() {
    if (!newName.trim()) { toast.error("Informe o nome do formato."); return; }
    const { error } = await supabase
      .from("service_formats")
      .insert({ service_id: serviceId, name: newName.trim(), position: list.length + 1 });
    if (error) { toast.error("Não foi possível adicionar."); return; }
    setNewName("");
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("service_formats").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover."); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quando a cliente escolher este serviço, abre uma tela para ela escolher um destes formatos.
        Sem formatos cadastrados, essa tela não aparece.
      </p>
      <ul className="space-y-3">
        {list.map((f) => (
          <li key={f.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="max-w-xs"
                aria-label="Nome do formato"
                value={edits[f.id] ?? f.name}
                onChange={(e) => setEdits({ ...edits, [f.id]: e.target.value })}
              />
              {edits[f.id] !== undefined && edits[f.id] !== f.name && (
                <Button size="sm" onClick={() => update(f.id, { name: edits[f.id]!.trim() })}>
                  Salvar
                </Button>
              )}
              <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => remove(f.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <ImageUpload
              path={f.image_url}
              prefix="formats"
              hint="Foto quadrada, 800 × 800 px (até 5 MB)."
              onUploaded={(p) => update(f.id, { image_url: p })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Novo formato (ex.: Almond)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" /> Adicionar formato
        </Button>
      </div>
    </div>
  );
}
