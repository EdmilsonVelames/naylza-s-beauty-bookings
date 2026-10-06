import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";

const MODE_KEY = "naylza.theme";

export const THEME_PRESETS = [
  { name: "Padrão (vinho)", primary: "", accent: "" },
  { name: "Rosa", primary: "#c2185b", accent: "#f8bbd0" },
  { name: "Lilás", primary: "#7e57c2", accent: "#d1c4e9" },
  { name: "Dourado", primary: "#a0782c", accent: "#f1d9a0" },
  { name: "Verde", primary: "#2e7d5b", accent: "#b9e3cf" },
  { name: "Preto", primary: "#262626", accent: "#d4c4a8" },
];

/** CSS variables for custom salon colors (empty = keep defaults). */
export function themeVars(primary: string, accent: string): Record<string, string> {
  const v: Record<string, string> = {};
  if (primary) {
    v["--primary"] = primary;
    v["--sidebar-primary"] = primary;
    v["--ring"] = primary;
    v["--gradient-hero"] = `linear-gradient(140deg, ${primary} 0%, color-mix(in oklch, ${primary} 70%, black) 55%, color-mix(in oklch, ${primary} 70%, ${accent || primary}) 100%)`;
  }
  if (accent) v["--accent"] = accent;
  return v;
}

/** Applies the saved day/night mode and the salon colors to the whole site. */
export function ThemeApplier() {
  const { data } = useSalonSettings();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem(MODE_KEY) === "dark");
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    for (const k of ["--primary", "--sidebar-primary", "--ring", "--gradient-hero", "--accent"]) root.style.removeProperty(k);
    for (const [k, val] of Object.entries(themeVars(data?.theme_primary ?? "", data?.theme_accent ?? ""))) root.style.setProperty(k, val);
  }, [data?.theme_primary, data?.theme_accent]);
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(MODE_KEY, next ? "dark" : "light");
  }
  return (
    <button
      type="button"
      aria-label={dark ? "Mudar para modo dia" : "Mudar para modo noite"}
      onClick={toggle}
      className={className ?? "flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
