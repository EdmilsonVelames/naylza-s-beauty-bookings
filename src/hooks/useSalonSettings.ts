import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_DEPOSIT_PERCENT = 50;

export const DEFAULT_HOURS = {
  open_time: "09:00",
  close_time: "19:00",
  slot_minutes: 30,
  break_start: "12:00",
  break_end: "13:00",
};

export function useSalonSettings() {
  return useQuery({
    queryKey: ["salon-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salon_settings").select("*").maybeSingle();
      if (error) throw error;
      return {
        deposit_percent: data?.deposit_percent ?? DEFAULT_DEPOSIT_PERCENT,
        open_time: data?.open_time ?? DEFAULT_HOURS.open_time,
        close_time: data?.close_time ?? DEFAULT_HOURS.close_time,
        slot_minutes: data?.slot_minutes ?? DEFAULT_HOURS.slot_minutes,
        break_start: data?.break_start ?? DEFAULT_HOURS.break_start,
        break_end: data?.break_end ?? DEFAULT_HOURS.break_end,
        logo_icon: data?.logo_icon ?? "scissors",
        logo_image: data?.logo_image ?? "",
        deposit_required: data?.deposit_required ?? true,
        allow_past_closing: data?.allow_past_closing ?? true,
        theme_primary: data?.theme_primary ?? "",
        theme_accent: data?.theme_accent ?? "",
      };
    },
  });
}

export function depositFor(totalCents: number, percent: number) {
  return Math.round((totalCents * percent) / 100);
}
