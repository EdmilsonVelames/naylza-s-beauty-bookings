import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { Button } from "@/components/ui/button";

/** Google Fonts offered to the salon. Empty value = keep the site default. */
export const FONT_OPTIONS = [
  "Karla",
  "Cormorant Garamond",
  "Playfair Display",
  "Lora",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "Quicksand",
  "Josefin Sans",
  "DM Serif Display",
  "Great Vibes",
  "Dancing Script",
  "Open Sans",
  "Roboto",
];

const DEFAULT_BODY = "Karla";
const DEFAULT_DISPLAY = "Cormorant Garamond";

export function ensureFontLoaded(family: string) {
  if (!family) return;
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function fontCss(body: string, display: string, scale: number) {
  const r: string[] = [];
  if (scale && scale !== 100) r.push(`html{font-size:${scale}%}`);
  if (body) r.push(`body,.font-sans{font-family:"${body}",ui-sans-serif,system-ui,sans-serif !important}`);
  if (display) r.push(`h1,h2,h3,.font-display{font-family:"${display}",Georgia,serif !important}`);
  return r.join("");
}

/** Applies the salon's chosen fonts and text size to the whole site. */
export function FontApplier() {
  const { data } = useSalonSettings();
  const body = data?.font_body ?? "";
  const display = data?.font_display ?? "";
  const scale = data?.font_scale ?? 100;
  useEffect(() => {
    ensureFontLoaded(body);
    ensureFontLoaded(display);
    let el = document.getElementById("salon-fonts");
    if (!el) {
      el = document.createElement("style");
      el.id = "salon-fonts";
      document.head.appendChild(el);
    }
    el.textContent = fontCss(body, display, scale);
  }, [body, display, scale]);
  return null;
}

/** Admin editor for fonts and text size. */
export function FontSettings() {
  const queryClient = useQueryClient();
  const { data } = useSalonSettings();
  const [body, setBody] = useState("");
  const [display, setDisplay] = useState("");
  const [scale, setScale] = useState(100);

  useEffect(() => {
    if (!data) return;
    setBody(data.font_body);
    setDisplay(data.font_display);
    setScale(data.font_scale);
  }, [data]);

  useEffect(() => {
    ensureFontLoaded(body || DEFAULT_BODY);
    ensureFontLoaded(display || DEFAULT_DISPLAY);
  }, [body, display]);

  async function save() {
    const { error } = await supabase
      .from("salon_settings")
      .update({ font_body: body, font_display: display, font_scale: scale })
      .eq("id", true);
    if (error) {
      toast.error("Não foi possível salvar as letras.");
      return;
    }
    toast.success("Letras do site atualizadas.");
    queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
  }

  const select = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-2xl">Letras do site</h2>
        <p className="text-sm text-muted-foreground">Escolha a fonte e o tamanho das letras de todas as telas.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span>Fonte dos títulos</span>
          <select className={select} value={display} onChange={(e) => setDisplay(e.target.value)}>
            <option value="">Padrão ({DEFAULT_DISPLAY})</option>
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span>Fonte dos textos</span>
          <select className={select} value={body} onChange={(e) => setBody(e.target.value)}>
            <option value="">Padrão ({DEFAULT_BODY})</option>
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span>Tamanho das letras: {scale}%</span>
        <input type="range" min={80} max={130} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-primary" />
        <span className="flex justify-between text-xs text-muted-foreground"><span>Menor</span><span>Normal (100%)</span><span>Maior</span></span>
      </label>
      <div className="rounded-xl border border-border p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Prévia</p>
        <p style={{ fontFamily: `"${display || DEFAULT_DISPLAY}"`, fontSize: `${1.75 * scale / 100}rem` }}>Salão Naylza Reis</p>
        <p style={{ fontFamily: `"${body || DEFAULT_BODY}"`, fontSize: `${0.9 * scale / 100}rem` }}>
          Beleza com hora marcada. Escolha o serviço, a profissional e o horário.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Salvar letras</Button>
        <Button variant="outline" onClick={() => { setBody(""); setDisplay(""); setScale(100); }}>Voltar ao padrão</Button>
      </div>
    </section>
  );
}
