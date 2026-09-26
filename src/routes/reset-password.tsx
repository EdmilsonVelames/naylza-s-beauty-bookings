import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (pwd.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (pwd !== confirm) { toast.error("As senhas não conferem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) {
      toast.error("Link expirado ou inválido. Peça um novo na tela de entrada.");
      return;
    }
    toast.success("Senha alterada!");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-5">
      <div className="surface-card w-full max-w-sm space-y-4 p-7">
        <h1 className="font-display text-3xl">Criar nova senha</h1>
        <div className="space-y-1.5">
          <Label htmlFor="p1">Nova senha</Label>
          <Input id="p1" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p2">Confirmar senha</Label>
          <Input id="p2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy} onClick={save}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </div>
    </div>
  );
}
