import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/components/AppShell";
import { uploadSalonImage } from "@/lib/images";
import { FONT_OPTIONS } from "@/lib/fonts";
import {
  DEFAULT_HOME, HOME_ICONS, HomeImg, saveHomeContent, useHomeContent,
  type HomeContent, type HomeIconKey,
} from "@/lib/home-content";

export const Route = createFileRoute("/_authenticated/admin/pagina-inicial")({
  head: () => ({
    meta: [
      { title: "Editar página inicial — Studio Naylza Reis" },
      { name: "description", content: "Troque fotos, textos e serviços da página inicial do Studio Naylza Reis." },
      { property: "og:title", content: "Editar página inicial — Studio Naylza Reis" },
      { property: "og:description", content: "Troque fotos, textos e serviços da página inicial." },
    ],
  }),
  component: Page,
});

const MAX = 5 * 1024 * 1024;

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  const t = n[i] as T;
  n[i] = n[j] as T;
  n[j] = t;
  return n;
}

function ImagePicker({ value, onChange, label, aspect = "aspect-[4/5]", onRemove }: {
  value: string; onChange: (v: string) => void; label?: string; aspect?: string; onRemove?: (() => void) | undefined;
}) {
  const [busy, setBusy] = useState(false);
  async function pick(file?: File) {
    if (!file) return;
    if (file.size > MAX) { toast.error("A imagem deve ter no máximo 5 MB."); return; }
    setBusy(true);
    try {
      onChange(await uploadSalonImage(file, "home"));
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className={`relative overflow-hidden rounded-xl border border-border ${aspect}`}>
        {value ? <HomeImg value={value} alt="" className="size-full" /> : <div className="flex size-full items-center justify-center bg-secondary text-xs text-muted-foreground">Sem imagem</div>}
      </div>
      <div className="flex gap-1">
        <Button asChild size="sm" variant="outline" className="flex-1" disabled={busy}>
          <label className="cursor-pointer">
            <ImagePlus className="size-4" />{busy ? "Enviando…" : "Trocar"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        </Button>
        {onRemove && <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remover"><Trash2 className="size-4" /></Button>}
      </div>
    </div>
  );
}

function ImageList({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((img, i) => (
        <div key={i} className="space-y-1">
          <ImagePicker value={img} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} onRemove={() => onChange(items.filter((_, k) => k !== i))} />
          <div className="flex justify-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onChange(move(items, i, -1))} aria-label="Mover para a esquerda"><ArrowUp className="size-4 -rotate-90" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onChange(move(items, i, 1))} aria-label="Mover para a direita"><ArrowDown className="size-4 -rotate-90" /></Button>
          </div>
        </div>
      ))}
      <AddImage onAdd={(v) => onChange([...items, v])} />
    </div>
  );
}

function AddImage({ onAdd }: { onAdd: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-secondary">
      <Plus className="size-5" />{busy ? "Enviando…" : "Adicionar foto"}
      <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        setBusy(true);
        for (const f of files) {
          if (f.size > MAX) { toast.error(`${f.name}: máximo 5 MB.`); continue; }
          try { onAdd(await uploadSalonImage(f, "home")); } catch { toast.error("Não foi possível enviar a imagem."); }
        }
        setBusy(false);
        e.target.value = "";
      }} />
    </label>
  );
}

function IconSelect({ value, onChange }: { value: HomeIconKey; onChange: (v: HomeIconKey) => void }) {
  return (
    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value as HomeIconKey)}>
      {Object.entries(HOME_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

function Block({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="surface-card space-y-4 p-6">
      <div><h2 className="font-display text-2xl">{title}</h2>{desc && <p className="text-sm text-muted-foreground">{desc}</p>}</div>
      {children}
    </section>
  );
}

function Page() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data } = useHomeContent();
  const qc = useQueryClient();
  const [c, setC] = useState<HomeContent | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data && !c) setC(data); }, [data, c]);

  if (isLoading || !c) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin) return <div className="surface-card p-6"><p>Esta área é exclusiva da administração.</p></div>;

  const set = (p: Partial<HomeContent>) => setC({ ...c, ...p });

  async function save() {
    setSaving(true);
    try {
      await saveHomeContent(c!);
      await qc.invalidateQueries({ queryKey: ["home-content"] });
      toast.success("Página inicial salva.");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="font-display text-4xl">Página inicial</h1>
        <p className="mt-1 text-muted-foreground">Troque fotos, textos e serviços. Clique em "Salvar" no fim para publicar as mudanças.</p>
      </div>

      <Block title="Imagem de fundo do topo" desc="Aparece atrás do título “Sua beleza natural…”.">
        <div className="max-w-md">
          <ImagePicker value={c.heroBg} onChange={(v) => set({ heroBg: v })} aspect="aspect-video" onRemove={() => set({ heroBg: "" })} />
        </div>
      </Block>

      <Block title="Números (5,0★, 3 anos, +200)">
        <div className="flex items-center gap-2"><Switch checked={c.statsVisible} onCheckedChange={(v) => set({ statsVisible: v })} /><span className="text-sm">{c.statsVisible ? "Visíveis" : "Ocultos"}</span></div>
        {c.stats.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input className="w-28" value={s.n} onChange={(e) => set({ stats: c.stats.map((x, k) => (k === i ? { ...x, n: e.target.value } : x)) })} />
            <Input className="flex-1" value={s.l} onChange={(e) => set({ stats: c.stats.map((x, k) => (k === i ? { ...x, l: e.target.value } : x)) })} />
            <Switch checked={!s.hidden} onCheckedChange={(v) => set({ stats: c.stats.map((x, k) => (k === i ? { ...x, hidden: !v } : x)) })} aria-label="Mostrar" />
            <Button size="icon" variant="ghost" onClick={() => set({ stats: c.stats.filter((_, k) => k !== i) })} aria-label="Remover"><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set({ stats: [...c.stats, { n: "", l: "" }] })}><Plus className="size-4" />Número</Button>
      </Block>

      <Block title="Carrossel de fotos" desc="Fica acima de “Quem conhece, recomenda”. Fotos verticais (4:5) ficam melhores.">
        <ImageList items={c.carousel} onChange={(v) => set({ carousel: v })} />
      </Block>

      <Block title="Nossos serviços">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Título</Label><Input value={c.servicesTitle} onChange={(e) => set({ servicesTitle: e.target.value })} /></div>
          <div><Label>Texto abaixo do título</Label><Input value={c.servicesSubtitle} onChange={(e) => set({ servicesSubtitle: e.target.value })} /></div>
        </div>
        <div className="space-y-4">
          {c.services.map((s, i) => {
            const upd = (p: Partial<typeof s>) => set({ services: c.services.map((x, k) => (k === i ? { ...x, ...p } : x)) });
            return (
              <div key={s.id} className={`grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-[140px_1fr] ${s.hidden ? "opacity-60" : ""}`}>
                <ImagePicker value={s.image} onChange={(v) => upd({ image: v })} aspect="aspect-square" onRemove={s.image ? () => upd({ image: "" }) : undefined} />
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Input className="flex-1" value={s.t} onChange={(e) => upd({ t: e.target.value })} placeholder="Nome" />
                    <IconSelect value={s.icon} onChange={(v) => upd({ icon: v })} />
                  </div>
                  <Textarea value={s.d} onChange={(e) => upd({ d: e.target.value })} rows={2} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch checked={!s.hidden} onCheckedChange={(v) => upd({ hidden: !v })} /><span className="text-sm">{s.hidden ? "Oculto" : "Visível"}</span>
                    <div className="ml-auto flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => set({ services: move(c.services, i, -1) })} aria-label="Subir"><ArrowUp className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => set({ services: move(c.services, i, 1) })} aria-label="Descer"><ArrowDown className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm(`Remover "${s.t}"?`) && set({ services: c.services.filter((_, k) => k !== i) })} aria-label="Remover"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" onClick={() => set({ services: [...c.services, { id: crypto.randomUUID(), t: "Novo serviço", d: "", icon: "sparkles", image: "", hidden: false }] })}><Plus className="size-4" />Serviço</Button>
      </Block>

      <Block title="Diferenciais (Por que escolher…)">
        <div><Label>Título</Label><Input value={c.pillarsTitle} onChange={(e) => set({ pillarsTitle: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Fonte dos títulos dos cards</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={c.pillarsFont} onChange={(e) => set({ pillarsFont: e.target.value })}>
              <option value="">Padrão do site</option>
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div><Label>Tamanho do título ({c.pillarsTitleSize}px)</Label><input type="range" min={16} max={40} value={c.pillarsTitleSize} onChange={(e) => set({ pillarsTitleSize: Number(e.target.value) })} className="w-full" /></div>
          <div><Label>Tamanho do texto ({c.pillarsTextSize}px)</Label><input type="range" min={11} max={22} value={c.pillarsTextSize} onChange={(e) => set({ pillarsTextSize: Number(e.target.value) })} className="w-full" /></div>
        </div>
        {c.pillars.map((p, i) => {
          const upd = (q: Partial<typeof p>) => set({ pillars: c.pillars.map((x, k) => (k === i ? { ...x, ...q } : x)) });
          return (
            <div key={i} className="flex flex-wrap items-start gap-2 rounded-xl border border-border p-3">
              <span className="pt-2 text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <IconSelect value={p.icon} onChange={(v) => upd({ icon: v })} />
              <Input className="min-w-40 flex-1" value={p.t} onChange={(e) => upd({ t: e.target.value })} />
              <Textarea className="basis-full" rows={2} value={p.d} onChange={(e) => upd({ d: e.target.value })} />
              <Button size="sm" variant="ghost" onClick={() => set({ pillars: c.pillars.filter((_, k) => k !== i) })}><Trash2 className="size-4" />Remover</Button>
            </div>
          );
        })}
        <Button size="sm" variant="outline" onClick={() => set({ pillars: [...c.pillars, { icon: "star", t: "Novo diferencial", d: "" }] })}><Plus className="size-4" />Diferencial</Button>
      </Block>

      <Block title="Galeria — Trabalhos que falam por nós">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Título</Label><Input value={c.galleryTitle} onChange={(e) => set({ galleryTitle: e.target.value })} /></div>
          <div><Label>Parte em itálico</Label><Input value={c.galleryItalic} onChange={(e) => set({ galleryItalic: e.target.value })} /></div>
        </div>
        <div><Label>Texto</Label><Textarea rows={2} value={c.galleryText} onChange={(e) => set({ galleryText: e.target.value })} /></div>
        <ImageList items={c.gallery} onChange={(v) => set({ gallery: v })} />
      </Block>

      <Block title="Antes e depois">
        <div className="grid gap-4 sm:grid-cols-3">
          {c.beforeAfter.map((b, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <ImagePicker label="Antes" value={b.before} onChange={(v) => set({ beforeAfter: c.beforeAfter.map((x, k) => (k === i ? { ...x, before: v } : x)) })} />
                <ImagePicker label="Depois" value={b.after} onChange={(v) => set({ beforeAfter: c.beforeAfter.map((x, k) => (k === i ? { ...x, after: v } : x)) })} />
              </div>
              <Button size="sm" variant="ghost" className="w-full" onClick={() => set({ beforeAfter: c.beforeAfter.filter((_, k) => k !== i) })}><Trash2 className="size-4" />Remover</Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => set({ beforeAfter: [...c.beforeAfter, { before: "", after: "" }] })}><Plus className="size-4" />Comparação</Button>
      </Block>

      <Block title="Localização">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Endereço</Label><Input value={c.address} onChange={(e) => set({ address: e.target.value })} /></div>
          <div><Label>Horário</Label><Input value={c.hours} onChange={(e) => set({ hours: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={c.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
          <div><Label>Busca no mapa</Label><Input value={c.mapsQuery} onChange={(e) => set({ mapsQuery: e.target.value })} /></div>
        </div>
      </Block>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl justify-between gap-2 px-4 py-3">
          <Button variant="ghost" onClick={() => confirm("Voltar tudo ao padrão? (precisa salvar depois)") && setC(DEFAULT_HOME)}>Voltar ao padrão</Button>
          <div className="flex gap-2">
            <Button asChild variant="outline"><a href="/" target="_blank" rel="noreferrer">Ver página</a></Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
