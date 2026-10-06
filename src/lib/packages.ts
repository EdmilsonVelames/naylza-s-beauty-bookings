import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PackageItemStatus = {
  serviceId: string;
  serviceName: string;
  quantity: number;
  used: number;
  remaining: number;
  intervalDays: number;
};

export type ClientPackage = {
  id: string;
  name: string;
  startsAt: string;
  expiresAt: string;
  expired: boolean;
  done: boolean;
  items: PackageItemStatus[];
};

export function intervalLabel(days: number) {
  if (!days) return "";
  if (days === 7) return "1 por semana";
  if (days === 15 || days === 14) return "a cada 15 dias";
  if (days === 30) return "1 por mês";
  return `a cada ${days} dias`;
}

/** Packages of a client with how many procedures were already booked. */
export function useClientPackages(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["client-packages", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ClientPackage[]> => {
      const { data: cps, error } = await supabase
        .from("client_packages")
        .select("id, starts_at, expires_at, package_service_id, services:package_service_id(name)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!cps?.length) return [];
      const pkgIds = [...new Set(cps.map((c) => c.package_service_id))];
      const [{ data: items }, { data: used }] = await Promise.all([
        supabase
          .from("package_items")
          .select("package_service_id, service_id, quantity, interval_days, services:service_id(name)")
          .in("package_service_id", pkgIds),
        supabase
          .from("appointments")
          .select("client_package_id, service_id")
          .in("client_package_id", cps.map((c) => c.id))
          .neq("status", "cancelled"),
      ]);
      const now = Date.now();
      return cps.map((c) => {
        const list = (items ?? [])
          .filter((i) => i.package_service_id === c.package_service_id)
          .map((i) => {
            const u = (used ?? []).filter((a) => a.client_package_id === c.id && a.service_id === i.service_id).length;
            return {
              serviceId: i.service_id,
              serviceName: i.services?.name ?? "",
              quantity: i.quantity,
              used: u,
              remaining: Math.max(i.quantity - u, 0),
              intervalDays: i.interval_days,
            };
          });
        const expired = new Date(c.expires_at).getTime() <= now;
        return {
          id: c.id,
          name: c.services?.name ?? "Pacote",
          startsAt: c.starts_at,
          expiresAt: c.expires_at,
          expired,
          done: list.length > 0 && list.every((i) => i.remaining === 0),
          items: list,
        };
      });
    },
  });
}

export function activePackageFor(pkgs: ClientPackage[] | undefined, serviceId: string) {
  return (pkgs ?? []).find(
    (p) => !p.expired && p.items.some((i) => i.serviceId === serviceId && i.remaining > 0),
  );
}
