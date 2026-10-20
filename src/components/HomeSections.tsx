import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOME_ICONS, HomeImg, type HomeContent } from "@/lib/home-content";
import { ensureFontLoaded } from "@/lib/fonts";
import { useEffect } from "react";

export function Stats({ c }: { c: HomeContent }) {
  const stats = c.stats.filter((s) => !s.hidden);
  if (!c.statsVisible || stats.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-8">
      {stats.map((s, i) => (
        <div key={i} className="text-center">
          <div className="font-display text-3xl font-semibold text-primary">{s.n}</div>
          <div className="text-xs text-muted-foreground">{s.l}</div>
        </div>
      ))}
    </div>
  );
}

export function Carousel({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  const loop = [...images, ...images];
  const seconds = Math.max(20, images.length * 6);
  return (
    <section className="overflow-hidden py-14" aria-label="Galeria de fotos">
      <div className="group relative">
        <div
          className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${seconds}s` }}
        >
          {loop.map((img, i) => (
            <div key={i} className="w-[66vw] shrink-0 sm:w-[40vw] lg:w-[21vw]">
              <HomeImg value={img} alt="Trabalho do Studio Naylza Reis" className="aspect-[4/5] w-full rounded-xl shadow-soft" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ServicesSection({ c }: { c: HomeContent }) {
  const list = c.services.filter((s) => !s.hidden);
  return (
    <section id="servicos" className="bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-4xl">{c.servicesTitle}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">{c.servicesSubtitle}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const Icon = HOME_ICONS[s.icon]?.Icon ?? HOME_ICONS.sparkles.Icon;
            if (!s.image) {
              return (
                <div key={s.id} className="surface-card flex flex-col p-6">
                  <Icon className="size-7 text-primary" />
                  <h3 className="mt-3 font-display text-2xl">{s.t}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.d}</p>
                  <Link to="/entrar" className="mt-4 text-sm font-semibold text-primary hover:underline">Agendar →</Link>
                </div>
              );
            }
            return (
              <div key={s.id} className="group relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl shadow-soft">
                <HomeImg value={s.image} alt={s.t} className="absolute inset-0 -z-20 size-full transition-transform duration-700 ease-out group-hover:scale-110" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground/85 via-foreground/45 to-foreground/10 dark:from-background/90 dark:via-background/55" />
                <div className="p-6 text-background dark:text-foreground">
                  <Icon className="size-7" />
                  <h3 className="mt-3 font-display text-2xl">{s.t}</h3>
                  <p className="mt-2 text-sm opacity-90">{s.d}</p>
                  <Link to="/entrar" className="mt-4 inline-block text-sm font-semibold hover:underline">Agendar →</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PillarsSection({ c }: { c: HomeContent }) {
  useEffect(() => { ensureFontLoaded(c.pillarsFont); }, [c.pillarsFont]);
  const font = c.pillarsFont ? `"${c.pillarsFont}", Georgia, serif` : undefined;
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Diferenciais</p>
      <h2 className="mt-2 text-center font-display text-4xl">{c.pillarsTitle}</h2>
      <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [&>*]:border-border [&>*]:border-b sm:[&>*]:border-r">
          {c.pillars.map((p, i) => {
            const Icon = HOME_ICONS[p.icon]?.Icon ?? HOME_ICONS.star.Icon;
            return (
              <div key={i} className="relative p-8">
                <span className="absolute right-6 top-6 text-xs tracking-widest text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex size-10 items-center justify-center rounded-full border border-border text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="mt-6 font-display font-semibold" style={{ fontFamily: font, fontSize: c.pillarsTitleSize }}>{p.t}</div>
                <p className="mt-2 font-sans text-muted-foreground" style={{ fontSize: c.pillarsTextSize }}>{p.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function GallerySection({ c }: { c: HomeContent }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.galleryKicker}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2 md:items-end">
        <h2 className="text-4xl md:text-5xl">
          {c.galleryTitle} <em className="font-display italic text-primary">{c.galleryItalic}</em>
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">{c.galleryText}</p>
      </div>
      {c.gallery.length > 0 && (
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {c.gallery.map((img, i) => (
            <div key={i} className="group overflow-hidden rounded-xl shadow-soft">
              <HomeImg value={img} alt="Trabalho do estúdio" className="aspect-[4/5] w-full transition-transform duration-700 group-hover:scale-105" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CompareSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/5] select-none overflow-hidden rounded-2xl shadow-soft">
      <HomeImg value={after} alt="Depois" className="absolute inset-0 size-full" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <HomeImg value={before} alt="Antes" className="absolute inset-0 size-full" />
      </div>
      <span className="absolute bottom-3 left-3 rounded-full bg-background/70 px-2 py-0.5 text-[10px] tracking-widest text-foreground backdrop-blur">ANTES</span>
      <span className="absolute bottom-3 right-3 rounded-full bg-background/70 px-2 py-0.5 text-[10px] tracking-widest text-foreground backdrop-blur">DEPOIS</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-background" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lift">
          <ChevronLeft className="size-4" /><ChevronRight className="size-4" />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparar antes e depois"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

export function BeforeAfterSection({ c }: { c: HomeContent }) {
  if (c.beforeAfter.length === 0) return null;
  return (
    <section className="bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Resultados reais</p>
        <h2 className="mt-2 text-3xl md:text-4xl">Transformações que <em className="font-display italic text-primary">falam por si</em></h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Arraste para ver o antes e depois. Resultados reais de clientes do Studio Naylza Reis.</p>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {c.beforeAfter.map((b, i) => <CompareSlider key={i} before={b.before} after={b.after} />)}
        </div>
      </div>
    </section>
  );
}

export function LocationSection({ c, whatsapp }: { c: HomeContent; whatsapp: string }) {
  const q = encodeURIComponent(c.mapsQuery || c.address);
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Localização</p>
      <h2 className="mt-2 text-center text-4xl">Venha nos <em className="font-display italic text-primary">visitar.</em></h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Estamos bem no centro de Itanhaém, em um espaço pensado para o seu conforto.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <iframe
          title="Mapa do Studio Naylza Reis"
          src={`https://www.google.com/maps?q=${q}&output=embed`}
          loading="lazy"
          className="min-h-80 w-full rounded-2xl border border-border [filter:sepia(0.25)_saturate(0.85)] dark:[filter:invert(0.9)_hue-rotate(180deg)_saturate(0.6)]"
        />
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card/40 p-8">
          <Info icon={MapPin} label="Endereço" text={c.address} />
          <Info icon={Clock} label="Horário" text={c.hours} />
          <Info icon={Phone} label="Contato" text={c.phone} />
          <div className="mt-auto flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="tracking-widest">
              <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">ABRIR NO GOOGLE MAPS <ExternalLink className="size-4" /></a>
            </Button>
            <Button asChild className="tracking-widest">
              <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> FALAR NO WHATSAPP</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, text }: { icon: typeof MapPin; label: string; text: string }) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-primary"><Icon className="size-4" /></span>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1">{text}</p>
      </div>
    </div>
  );
}
