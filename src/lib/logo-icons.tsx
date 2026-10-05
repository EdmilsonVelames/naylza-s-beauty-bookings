import { Crown, Flower2, Gem, Hand, Heart, Scissors, Sparkles, Star, Sun, Brush, Eye, Feather } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { SalonImage } from "@/lib/images";

export const LOGO_ICONS = {
  scissors: { label: "Tesoura", Icon: Scissors },
  sparkles: { label: "Brilho", Icon: Sparkles },
  flower: { label: "Flor", Icon: Flower2 },
  heart: { label: "Coração", Icon: Heart },
  crown: { label: "Coroa", Icon: Crown },
  gem: { label: "Diamante", Icon: Gem },
  star: { label: "Estrela", Icon: Star },
  hand: { label: "Mão", Icon: Hand },
  brush: { label: "Pincel", Icon: Brush },
  eye: { label: "Olho (cílios)", Icon: Eye },
  feather: { label: "Pena", Icon: Feather },
  sun: { label: "Sol", Icon: Sun },
} as const;

export type LogoIconKey = keyof typeof LOGO_ICONS;

/** Salon logo icon chosen by the admin (falls back to scissors). */
export function SalonLogoIcon({ className }: { className?: string }) {
  const { data } = useSalonSettings();
  if (data?.logo_image) {
    return <SalonImage path={data.logo_image} alt="Logo do salão" className="size-full rounded-full" />;
  }
  const key = (data?.logo_icon ?? "scissors") as string;
  const entry = LOGO_ICONS[key as LogoIconKey] ?? LOGO_ICONS.scissors;
  return <entry.Icon className={className} />;
}
