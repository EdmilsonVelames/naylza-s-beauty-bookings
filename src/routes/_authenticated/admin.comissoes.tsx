import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsStaff } from "@/components/AppShell";
import { formatBRL } from "@/lib/salon";

export const Route = createFileRoute("/_authenticated/admin/comissoes")({
  head: () => ({
    meta: [
      { title: "Comissões — Salão Naylza Reis" },
      { name: "description", content: "Atendimentos, faturamento e comissão de cada profissional." },
      { property: "og:title", content: "Comissões — Salão Naylza Reis" },
      { property: "og:description", content: "Atendimentos, faturamento e comissão de cada profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Comissoes,
});

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function Comissoes() {
  const { isStaff, isAdmin, myPro, isLoading } = useIsStaff();
  const queryClient = useQueryClient();
  const now = new Date();
  const [from, setFrom] = useState(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(ymd(now));

  const { data } = useQuery({
    queryKey: ["comissoes", from, to],
    enabled: isStaff,
    queryFn: async () => {
      const [pros, appts] = await Promise.all([
        supabase.from("professionals").select("id, name, commission_percent").order("name"),
        supabase
          .from("appointments")
          .select("professional_id, paid_cents, starts_at")
          .neq("status", "cancelled")
          .gt("paid_cents", 0)
          .gte("starts_at", new Date(`${from}T00:00:00`).toISOString())
          .lte("starts_at", new Date(`${to}T23:59:59`).toISOString()),
      ]);
      return { pros: pros.data ?? [], appts: appts.data ?? [] };
    },
  });

  if (isLoading) return null;
  if (!isStaff) return <p className="text-muted-foreground">Área do salão — exclusiva da equipe.</p>;

  const rows = (data?.pros ?? [])
    .filter((p) => isAdmin || p.id === myPro?.id)
    .map((p) => {
      const list = (data?.appts ?? []).filter((a) => a.professional_id === p.id);
      const revenue = list.reduce((s, a) => s + a.paid_cents, 0);
      return { ...p, count: list.length, revenue };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Comissões</h1>
        <p className="mt-1 text-muted-foreground">Calculadas sobre o valor já recebido de cada atendimento.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
      </div>
      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="p-3">Profissional</th>
              <th className="p-3">Atendimentos</th>
              <th className="p-3">Faturamento</th>
              <th className="p-3">Percentual</th>
              <th className="p-3">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row
                key={r.id}
                row={r}
                editable={isAdmin}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["comissoes"] })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  editable,
  onSaved,
}: {
  row: { id: string; name: string; commission_percent: number; count: number; revenue: number };
  editable: boolean;
  onSaved: () => void;
}) {
  const [pct, setPct] = useState(String(row.commission_percent));
  const n = Math.min(100, Math.max(0, Number(pct) || 0));

  async function save() {
    const { error } = await supabase.from("professionals").update({ commission_percent: n }).eq("id", row.id);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Percentual atualizado.");
    onSaved();
  }

  return (
    <tr className="border-t border-border">
      <td className="p-3 font-medium">{row.name}</td>
      <td className="p-3">{row.count}</td>
      <td className="p-3">{formatBRL(row.revenue)}</td>
      <td className="p-3">
        {editable ? (
          <div className="flex items-center gap-2">
            <Input className="w-20" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
            <span>%</span>
            {n !== row.commission_percent ? (
              <Button size="sm" onClick={save}>
                Salvar
              </Button>
            ) : null}
          </div>
        ) : (
          `${row.commission_percent}%`
        )}
      </td>
      <td className="p-3 font-display text-lg">{formatBRL(Math.round((row.revenue * n) / 100))}</td>
    </tr>
  );
}
