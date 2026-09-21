import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_DEPOSIT_PERCENT = 50;

export function useSalonSettings() {
  return useQuery({
    queryKey: ["salon-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_settings")
        .select("deposit_percent")
        .maybeSingle();
      if (error) throw error;
      return { deposit_percent: data?.deposit_percent ?? DEFAULT_DEPOSIT_PERCENT };
    },
  });
}

export function depositFor(totalCents: number, percent: number) {
  return Math.round((totalCents * percent) / 100);
}
