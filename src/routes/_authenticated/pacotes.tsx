import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { intervalLabel, useClientPackages } from "@/lib/packages";

export const Route = createFileRoute("/_authenticated/pacotes")({
  head: () => ({
    meta: [
      { title: "Meus pacotes — Salão Naylza Reis" },
      { name: "description", content: "Acompanhe os procedimentos que ainda restam nos seus pacotes." },
      { property: "og:title", content: "Meus pacotes — Salão Naylza Reis" },
      { property: "og:description", content: "Procedimentos restantes nos seus pacotes." },
    ],
  }),
  component: Pacotes,
});

function Pacotes() {
  const { user } = useAuth();
  const { data, isLoading } = useClientPackages(user?.id);
  const active = (data ?? []).filter((p) => !p.done && !p.expired);
  const old = (data ?? []).filter((p) => p.done || p.expired);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Meus pacotes</h1>
        <p className="mt-1 text-muted-foreground">
          Seus pacotes ficam aqui até você fazer todos os procedimentos.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : active.length === 0 ? (
        <div className="surface-card flex flex-wrap items-center gap-3 p-6 text-sm text-muted-foreground">
          <Package className="size-5" /> Você não tem pacotes ativos.
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/booking">Ver pacotes no agendamento</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {active.map((p) => (
            <li key={p.id} className="surface-card overflow-hidden">
              <div className="bg-hero px-5 py-4 text-primary-foreground">
                <p className="font-display text-2xl">{p.name}</p>
                <p className="text-sm opacity-90">
                  Válido até {new Date(p.expiresAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <ul className="divide-y divide-border">
                {p.items.map((i) => (
                  <li key={i.serviceId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{i.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {i.used} de {i.quantity} agendados
                        {i.intervalDays ? ` · ${intervalLabel(i.intervalDays)}` : ""}
                      </p>
                    </div>
                    {i.remaining > 0 ? (
                      <>
                        <Badge variant="secondary">Faltam {i.remaining}</Badge>
                        <Button asChild size="sm">
                          <Link to="/booking">Agendar</Link>
                        </Button>
                      </>
                    ) : (
                      <Badge>Concluído</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {old.length ? (
        <section className="space-y-2">
          <h2 className="font-display text-2xl">Pacotes encerrados</h2>
          {old.map((p) => (
            <p key={p.id} className="surface-card p-4 text-sm text-muted-foreground">
              {p.name} · {p.done ? "todos os procedimentos feitos" : "vencido"}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
