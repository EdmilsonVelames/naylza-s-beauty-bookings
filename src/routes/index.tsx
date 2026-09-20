import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Scissors, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SALON_NAME } from "@/lib/salon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Salão Naylza Reis" },
      {
        name: "description",
        content:
          "Acesse sua conta para agendar horários no Salão Naylza Reis e confirmar com 50% antecipado.",
      },
      { property: "og:title", content: "Entrar — Salão Naylza Reis" },
      {
        property: "og:description",
        content: "Agende cortes, coloração e maquiagem no Salão Naylza Reis.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar. Verifique e-mail e senha.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Bem-vinda ao salão.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-hero p-12 text-primary-foreground md:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
            <Scissors className="size-5" />
          </span>
          <span className="font-display text-xl">{SALON_NAME}</span>
        </div>
        <div>
          <h1 className="font-display text-5xl leading-tight">
            Beleza com hora marcada,
            <br />
            do seu jeito.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/80">
            Escolha o serviço, a profissional e o horário. Garanta sua reserva com 50% antecipado e
            pague o restante no dia.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Agenda online · Salão {SALON_NAME}</p>
      </div>

      <div className="flex items-center justify-center bg-soft px-5 py-12">
        <div className="w-full max-w-sm surface-card p-7">
          <div className="mb-6 flex items-center gap-2 text-primary md:hidden">
            <Sparkles className="size-5" />
            <span className="font-display text-xl">{SALON_NAME}</span>
          </div>
          <h2 className="font-display text-3xl">Entrar ou criar conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use seu e-mail para acessar sua agenda.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome (para nova conta)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button className="w-full" disabled={loading} onClick={handleSignIn}>
              Entrar
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={handleSignUp}
            >
              Criar conta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
