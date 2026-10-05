import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Home, Scissors, Sparkles, User2, Settings, Wallet, Users, Menu, LogOut, Percent } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { SALON_NAME } from "@/lib/salon";
import { SalonLogoIcon } from "@/lib/logo-icons";

const links = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/booking", label: "Agendar", icon: Sparkles },
  { to: "/appointments", label: "Agendamentos", icon: CalendarDays },
  { to: "/profile", label: "Perfil", icon: User2 },
] as const;

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}

/** Professional record linked to the signed-in account, or null. */
export function useMyProfessional() {
  return useQuery({
    queryKey: ["my-professional"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      return data ?? null;
    },
  });
}

export function useIsStaff() {
  const { data: isAdmin, isLoading: a } = useIsAdmin();
  const { data: myPro, isLoading: b } = useMyProfessional();
  return { isAdmin: Boolean(isAdmin), myPro: myPro ?? null, isStaff: Boolean(isAdmin || myPro), isLoading: a || b };
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin();
  const { data: myPro } = useMyProfessional();
  const [open, setOpen] = useState(false);

  async function signOut() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const items: { to: string; label: string; icon: typeof Home }[] = [...links];
  if (!isAdmin && myPro) items.push({ to: "/admin/schedule", label: "Minha agenda", icon: CalendarDays });
  if (isAdmin || myPro) {
    items.push({ to: "/admin/clientes", label: "Clientes", icon: Users });
    items.push({ to: "/admin/comissoes", label: "Comissões", icon: Percent });
  }
  if (isAdmin) {
    items.push({ to: "/admin/schedule", label: "Agenda do salão", icon: CalendarDays });
    items.push({ to: "/admin/salon", label: "Administração", icon: Settings });
    items.push({ to: "/admin/services", label: "Serviços", icon: Scissors });
    items.push({ to: "/admin/caixa", label: "Caixa", icon: Wallet });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-hero text-primary-foreground">
              <SalonLogoIcon className="size-4" />
            </span>
            <span className="font-display text-lg leading-none font-semibold">{SALON_NAME}</span>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menu"
                className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                {items.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/70"
                  >
                    <l.icon className="size-4 text-primary" />
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={signOut}
                  className="mt-4 flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <LogOut className="size-4" />
                  Sair
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">{children}</main>
    </div>
  );
}
