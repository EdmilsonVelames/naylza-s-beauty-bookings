import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Home, Scissors, Sparkles, User2, Settings, Wallet, Users } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SALON_NAME } from "@/lib/salon";

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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-hero text-primary-foreground">
              <Scissors className="size-4" />
            </span>
            <span className="font-display text-lg leading-none font-semibold">{SALON_NAME}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
              >
                {l.label}
              </Link>
            ))}
            {!isAdmin && myPro ? (
              <Link to="/admin/schedule" activeProps={{ className: "bg-secondary text-secondary-foreground" }} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70">
                Minha agenda
              </Link>
            ) : null}
            {isAdmin || myPro ? (
              <>
                <Link to="/admin/clientes" activeProps={{ className: "bg-secondary text-secondary-foreground" }} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70">
                  Clientes
                </Link>
                <Link to="/admin/comissoes" activeProps={{ className: "bg-secondary text-secondary-foreground" }} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70">
                  Comissões
                </Link>
              </>
            ) : null}
            {isAdmin ? (
              <>
                <Link
                  to="/admin/schedule"
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                  className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
                >
                  Agenda do salão
                </Link>
                <Link
                  to="/admin/salon"
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                  className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
                >
                  Administração
                </Link>
                <Link
                  to="/admin/services"
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                  className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
                >
                  Serviços
                </Link>
                <Link
                  to="/admin/caixa"
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                  className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
                >
                  Caixa
                </Link>
              </>
            ) : null}
          </nav>
          <button
            onClick={signOut}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"
            >
              <l.icon className="size-5" />
              {l.label}
            </Link>
          ))}
          {isAdmin || myPro ? (
            <Link to="/admin/clientes" activeProps={{ className: "text-primary" }} className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground">
              <Users className="size-5" />
              Clientes
            </Link>
          ) : null}
          {isAdmin ? (
            <>
              <Link
                to="/admin/schedule"
                activeProps={{ className: "text-primary" }}
                className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"
              >
                <Settings className="size-5" />
                Salão
              </Link>
              <Link
                to="/admin/caixa"
                activeProps={{ className: "text-primary" }}
                className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"
              >
                <Wallet className="size-5" />
                Caixa
              </Link>
            </>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
