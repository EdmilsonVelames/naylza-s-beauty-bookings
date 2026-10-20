import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Eye, Brush, Smile, Footprints, Package, Award, Heart, ShieldCheck, Gem, Home, Star,
  Scissors, Flower2, Crown, Hand, Sun, Feather,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalonImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import g1 from "@/assets/home/g1.jpg";
import g2 from "@/assets/home/g2.jpg";
import g3 from "@/assets/home/g3.jpg";
import g4 from "@/assets/home/g4.jpg";
import g5 from "@/assets/home/g5.jpg";
import hero from "@/assets/home/hero.jpg";

export const HOME_ICONS = {
  sparkles: { label: "Brilho", Icon: Sparkles },
  eye: { label: "Olho", Icon: Eye },
  brush: { label: "Pincel", Icon: Brush },
  smile: { label: "Rosto", Icon: Smile },
  feet: { label: "Pés", Icon: Footprints },
  package: { label: "Pacote", Icon: Package },
  award: { label: "Medalha", Icon: Award },
  heart: { label: "Coração", Icon: Heart },
  shield: { label: "Escudo", Icon: ShieldCheck },
  gem: { label: "Diamante", Icon: Gem },
  home: { label: "Casa", Icon: Home },
  star: { label: "Estrela", Icon: Star },
  scissors: { label: "Tesoura", Icon: Scissors },
  flower: { label: "Flor", Icon: Flower2 },
  crown: { label: "Coroa", Icon: Crown },
  hand: { label: "Mão", Icon: Hand },
  sun: { label: "Sol", Icon: Sun },
  feather: { label: "Pena", Icon: Feather },
} as const;
export type HomeIconKey = keyof typeof HOME_ICONS;

/** Bundled demo pictures. An image value is either "demo:<key>" or a stored file path. */
const DEMO: Record<string, string> = { g1, g2, g3, g4, g5, hero };

export type HomeService = { id: string; t: string; d: string; icon: HomeIconKey; image: string; hidden: boolean };
export type HomePillar = { t: string; d: string; icon: HomeIconKey };
export type HomeStat = { n: string; l: string; hidden?: boolean };
export type BeforeAfter = { before: string; after: string };

export type HomeContent = {
  heroBg: string;
  statsVisible: boolean;
  stats: HomeStat[];
  carousel: string[];
  servicesTitle: string;
  servicesSubtitle: string;
  services: HomeService[];
  pillarsTitle: string;
  pillarsFont: string;
  pillarsTitleSize: number;
  pillarsTextSize: number;
  pillars: HomePillar[];
  galleryKicker: string;
  galleryTitle: string;
  galleryItalic: string;
  galleryText: string;
  gallery: string[];
  beforeAfter: BeforeAfter[];
  address: string;
  hours: string;
  phone: string;
  mapsQuery: string;
};

export const DEFAULT_HOME: HomeContent = {
  heroBg: "demo:hero",
  statsVisible: true,
  stats: [
    { n: "5,0★", l: "no Google" },
    { n: "3 anos", l: "de experiência" },
    { n: "+200", l: "clientes atendidas" },
  ],
  carousel: ["demo:g1", "demo:g2", "demo:g3", "demo:g4", "demo:g5"],
  servicesTitle: "Nossos serviços",
  servicesSubtitle: "Técnica apurada e atendimento pensado para o seu estilo, do primeiro detalhe ao acabamento.",
  services: [
    { id: "s1", icon: "sparkles", t: "Unhas", d: "Esmaltação, alongamento e nail art com acabamento impecável e durabilidade de verdade.", image: "demo:g1", hidden: false },
    { id: "s2", icon: "eye", t: "Cílios", d: "Olhar marcante desde o acordar, com fios leves, confortáveis e efeito sob medida para você.", image: "demo:g2", hidden: false },
    { id: "s3", icon: "brush", t: "Sobrancelha", d: "Design que valoriza seu rosto e harmoniza a expressão, respeitando sua beleza natural.", image: "", hidden: false },
    { id: "s4", icon: "smile", t: "Rosto", d: "Cuidados faciais que renovam a pele e devolvem o viço, para você se sentir radiante.", image: "demo:g4", hidden: false },
    { id: "s5", icon: "feet", t: "Pés", d: "Pés macios, bem cuidados e prontos para qualquer sandália, com higiene total.", image: "demo:g3", hidden: false },
    { id: "s6", icon: "package", t: "Pacotes", d: "Combine seus serviços favoritos, economize e mantenha a rotina de beleza em dia.", image: "", hidden: false },
  ],
  pillarsTitle: "Por que escolher o Studio Naylza Reis?",
  pillarsFont: "",
  pillarsTitleSize: 24,
  pillarsTextSize: 14,
  pillars: [
    { icon: "award", t: "Profissional qualificada", d: "Técnicas atualizadas e cursos constantes para entregar o melhor resultado." },
    { icon: "heart", t: "Atendimento personalizado", d: "Cada cliente é única: ouvimos você antes de começar qualquer procedimento." },
    { icon: "gem", t: "Produtos de qualidade", d: "Trabalhamos apenas com marcas reconhecidas, seguras e de alta performance." },
    { icon: "shield", t: "Higiene e segurança", d: "Materiais esterilizados e descartáveis, porque sua saúde vem primeiro." },
    { icon: "home", t: "Ambiente acolhedor", d: "Um espaço tranquilo e aconchegante para você relaxar enquanto se cuida." },
    { icon: "star", t: "Resultados que encantam", d: "Mais de 200 clientes atendidas e avaliação máxima no Google." },
  ],
  galleryKicker: "GALERIA",
  galleryTitle: "Trabalhos que",
  galleryItalic: "falam por nós.",
  galleryText: "Uma amostra das transformações feitas no nosso estúdio. Cada cliente é uma história única.",
  gallery: ["demo:g5", "demo:g2", "demo:g4", "demo:g1"],
  beforeAfter: [
    { before: "demo:g1~before", after: "demo:g1" },
    { before: "demo:g2~before", after: "demo:g2" },
    { before: "demo:g4~before", after: "demo:g4" },
  ],
  address: "R. Leão XIII, 425 - Suarão, Itanhaém - SP, 11740-730",
  hours: "Segunda a Sábado · 09h — 19h",
  phone: "(13) 99807-1897",
  mapsQuery: "Studio Naylza Reis, R. Leão XIII, 425 - Suarão, Itanhaém - SP",
};

export function mergeHome(raw: unknown): HomeContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<HomeContent>;
  return { ...DEFAULT_HOME, ...r };
}

export function useHomeContent() {
  return useQuery({
    queryKey: ["home-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salon_settings").select("home_content").maybeSingle();
      if (error) throw error;
      return mergeHome(data?.home_content);
    },
  });
}

export async function saveHomeContent(content: HomeContent) {
  const { error } = await supabase
    .from("salon_settings")
    .update({ home_content: content as never, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
}

export function useHomeImageSrc(value: string | null | undefined) {
  const isDemo = Boolean(value?.startsWith("demo:"));
  const { data } = useSalonImageUrl(isDemo ? null : value);
  if (!value) return { src: undefined, before: false };
  if (isDemo) {
    const [key, mod] = value.slice(5).split("~");
    return { src: DEMO[key ?? ""], before: mod === "before" };
  }
  return { src: data, before: false };
}

/** Renders a home-page image (demo or uploaded). */
export function HomeImg({ value, alt, className, eager }: { value: string; alt: string; className?: string; eager?: boolean }) {
  const { src, before } = useHomeImageSrc(value);
  if (!src) return <div className={cn("bg-secondary", className)} />;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      className={cn("object-cover", className)}
      style={before ? { filter: "grayscale(0.7) brightness(0.92) contrast(0.9) blur(0.6px)" } : undefined}
    />
  );
}
