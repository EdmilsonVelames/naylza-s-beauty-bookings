import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Salão Naylza Reis" },
      { name: "description", content: "Crie uma nova senha para acessar sua conta." },
      { property: "og:title", content: "Nova senha — Salão Naylza Reis" },
      { property: "og:description", content: "Crie uma nova senha para acessar sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

type Status = "checking" | "ready" | "invalid";

function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let done = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setStatus("invalid");
      return;
    }
    const markReady = () => {
      if (done) return;
      done = true;
      setStatus("ready");
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) markReady();
    });
    (async () => {
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("invalid");
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) markReady();
      else
        setTimeout(async () => {
          const { data: again } = await supabase.auth.getSession();
          if (again.session) markReady();
          else if (!done) setStatus("invalid");
        }, 2500);
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    if (pwd.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (pwd !== confirm) { toast.error("As senhas não conferem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) {
      const msg = `${error.code ?? ""} ${error.message}`;
      if (/weak|pwned|guess|characters/i.test(msg)) {
        toast.error("Essa senha é muito fácil de adivinhar. Use uma senha mais forte, misturando letras, números e símbolos.");
      } else if (/same_password|different from the old/i.test(msg)) {
        toast.error("A nova senha precisa ser diferente da anterior.");
      } else if (/session|jwt|expired|not authenticated/i.test(msg)) {
        setStatus("invalid");
      } else {
        toast.error("Não foi possível salvar a senha. Tente outra senha.");
      }
      return;
    }
    toast.success("Senha alterada!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function resend() {
    if (!email) { toast.error("Digite seu e-mail."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error("Não foi possível enviar o e-mail. Aguarde alguns minutos e tente de novo."); return; }
    toast.success("Enviamos um novo link. Abra o e-mail mais recente.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-5">
      <div className="surface-card w-full max-w-sm space-y-4 p-7">
        <h1 className="font-display text-3xl">Criar nova senha</h1>
        {status === "checking" ? (
          <p className="text-sm text-muted-foreground">Verificando o link…</p>
        ) : status === "invalid" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Este link já foi usado ou expirou. Cada link funciona uma única vez — use sempre o e-mail mais recente.
              Peça um novo abaixo.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="mail">E-mail</Label>
              <Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy} onClick={resend}>
              {busy ? "Enviando…" : "Enviar novo link"}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="p1">Nova senha</Label>
              <PasswordInput id="p1" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p2">Confirmar senha</Label>
              <PasswordInput id="p2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Use letras, números e símbolos. Senhas muito comuns são recusadas.</p>
            <Button className="w-full" disabled={busy} onClick={save}>
              {busy ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
