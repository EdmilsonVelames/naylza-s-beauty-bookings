import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Salão Naylza Reis" },
      { name: "description", content: "Atualize seus dados pessoais e de contato." },
      { property: "og:title", content: "Meu perfil — Salão Naylza Reis" },
      { property: "og:description", content: "Atualize seus dados pessoais e de contato." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { id: userData.user.id, full_name: "", phone: "", email: userData.user.email ?? "" };
    },
  });

  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setEmail(data.email ?? "");
  }, [data]);

  async function save() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userData.user.id, full_name: fullName, phone, email });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Dados atualizados.");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-4xl">Meu perfil</h1>
        <p className="mt-1 text-muted-foreground">Mantenha seus dados de contato atualizados.</p>
      </div>

      <div className="surface-card space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tel">Telefone</Label>
          <Input
            id="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mail">E-mail</Label>
          <Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled={saving} onClick={save}>
            Salvar
          </Button>
          <Button variant="outline" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
