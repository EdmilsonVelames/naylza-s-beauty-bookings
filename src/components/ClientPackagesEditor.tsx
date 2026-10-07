import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientPackages, type ClientPackage } from "@/lib/packages";

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function endOfDayIso(d: string) {
  return new Date(`${d}T23:59:59`).toISOString();
}

/** Staff tool: add a package already in progress and set how many procedures remain. */
export function ClientPackagesEditor({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data: pkgs } = useClientPackages(userId);
  const [adding, setAdding] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["client-packages", userId] });
  const active = (pkgs ?? []).filter((p) => !p.expired && !p.done);

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-medium">
          <Package className="size-4 text-primary" /> Pacotes
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {adding ? "Fechar" : "+ Pacote em andamento"}
        </Button>
      </div>
      {active.length === 0 && !adding ? <p className="text-muted-foreground">Nenhum pacote ativo.</p> : null}
      {active.map((p) => (
        <PackageRow key={p.id} pkg={p} onSaved={refresh} />
      ))}
      {adding ? (
        <NewPackage
          userId={userId}
          onDone={() => {
            setAdding(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function PackageRow({ pkg, onSaved }: { pkg: ClientPackage; onSaved: () => void }) {
  const [left, setLeft] = useState<Record<string, string>>(
    Object.fromEntries(pkg.items.map((i) => [i.serviceId, String(i.remaining)])),
  );
  const [until, setUntil] = useState(toDateInput(pkg.expiresAt));

  async function save() {
    const quantities: Record<string, number> = {};
    for (const i of pkg.items) quantities[i.serviceId] = i.used + Math.max(0, Number(left[i.serviceId]) || 0);
    const { error } = await supabase
      .from("client_packages")
      .update({ quantities, expires_at: endOfDayIso(until) })
      .eq("id", pkg.id);
    if (error) {
      toast.error("Não foi possível salvar o pacote.");
      return;
    }
    toast.success("Pacote atualizado.");
    onSaved();
  }
  async function remove() {
    if (!window.confirm(`Remover o pacote ${pkg.name} desta cliente?`)) return;
    const { error } = await supabase.from("client_packages").delete().eq("id", pkg.id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-2 rounded-md bg-muted/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{pkg.name}</span>
        <Button size="icon" variant="ghost" aria-label="Remover pacote" onClick={remove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      {pkg.items.map((i) => (
        <label key={i.serviceId} className="flex items-center gap-2">
          <span className="flex-1">{i.serviceName}</span>
          <span className="text-xs text-muted-foreground">faltam</span>
          <Input
            type="number"
            min={0}
            className="h-8 w-16"
            value={left[i.serviceId] ?? "0"}
            onChange={(e) => setLeft({ ...left, [i.serviceId]: e.target.value })}
          />
        </label>
      ))}
      <label className="flex items-center gap-2">
        <span className="flex-1">Válido até</span>
        <Input type="date" className="h-8 w-40" value={until} onChange={(e) => setUntil(e.target.value)} />
      </label>
      <Button size="sm" onClick={save}>Salvar pacote</Button>
    </div>
  );
}

function NewPackage({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [pkgId, setPkgId] = useState("");
  const [left, setLeft] = useState<Record<string, string>>({});
  const [until, setUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateInput(d.toISOString());
  });
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["all-package-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_items")
        .select("package_service_id, service_id, quantity, pkg:package_service_id(name), svc:service_id(name)");
      if (error) throw error;
      return data;
    },
  });
  const packages = [...new Map((items ?? []).map((i) => [i.package_service_id, i.pkg?.name ?? "Pacote"])).entries()];
  const chosen = (items ?? []).filter((i) => i.package_service_id === pkgId);

  function pick(id: string) {
    setPkgId(id);
    setLeft(
      Object.fromEntries(
        (items ?? []).filter((i) => i.package_service_id === id).map((i) => [i.service_id, String(i.quantity)]),
      ),
    );
  }

  async function create() {
    if (!pkgId) return;
    setBusy(true);
    const quantities = Object.fromEntries(chosen.map((i) => [i.service_id, Math.max(0, Number(left[i.service_id]) || 0)]));
    const { error } = await supabase.from("client_packages").insert({
      user_id: userId,
      package_service_id: pkgId,
      expires_at: endOfDayIso(until),
      quantities,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível adicionar o pacote.");
      return;
    }
    toast.success("Pacote adicionado para a cliente.");
    onDone();
  }

  return (
    <div className="space-y-2 rounded-md bg-muted/60 p-2">
      {packages.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum pacote montado ainda. Em "Serviços", use o ícone de caixa para dizer o que vem em cada pacote.
        </p>
      ) : (
        <>
          <select
            value={pkgId}
            onChange={(e) => pick(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2"
          >
            <option value="">Escolha o pacote…</option>
            {packages.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          {chosen.map((i) => (
            <label key={i.service_id} className="flex items-center gap-2">
              <span className="flex-1">{i.svc?.name}</span>
              <span className="text-xs text-muted-foreground">ainda vai fazer</span>
              <Input
                type="number"
                min={0}
                className="h-8 w-16"
                value={left[i.service_id] ?? "0"}
                onChange={(e) => setLeft({ ...left, [i.service_id]: e.target.value })}
              />
            </label>
          ))}
          {pkgId ? (
            <>
              <label className="flex items-center gap-2">
                <span className="flex-1">Válido até</span>
                <Input type="date" className="h-8 w-40" value={until} onChange={(e) => setUntil(e.target.value)} />
              </label>
              <Button size="sm" disabled={busy} onClick={create}>Adicionar pacote</Button>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
