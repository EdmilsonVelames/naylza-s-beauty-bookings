import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

function toWhatsAppNumber(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!d.startsWith("55") || d.length < 12 || d.length > 13) return null;
  return d;
}

export const Route = createFileRoute("/api/public/whatsapp/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
        const WHATSAPP_API_KEY = process.env["WHATSAPP_API_KEY"];
        if (!LOVABLE_API_KEY || !WHATSAPP_API_KEY) {
          return new Response("WhatsApp not configured", { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        const from = new Date(now + 90 * 60_000).toISOString();
        const to = new Date(now + 150 * 60_000).toISOString();

        const { data: due, error } = await supabaseAdmin
          .from("appointments")
          .select("id, user_id, starts_at, guest_name, guest_phone, services(name)")
          .in("status", ["confirmed", "paid"])
          .is("reminder_sent_at", null)
          .gte("starts_at", from)
          .lte("starts_at", to)
          .limit(30);
        if (error) return new Response(error.message, { status: 500 });

        let sent = 0;
        const results: { id: string; ok: boolean }[] = [];
        for (const a of due ?? []) {
          // Claim the row so a reminder is never sent twice.
          const { data: claimed } = await supabaseAdmin
            .from("appointments")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", a.id)
            .is("reminder_sent_at", null)
            .select("id")
            .maybeSingle();
          if (!claimed) continue;

          let name = a.guest_name || "";
          let phone = a.guest_phone || "";
          if (!a.guest_name && a.user_id) {
            const { data: p } = await supabaseAdmin
              .from("profiles")
              .select("full_name, phone")
              .eq("id", a.user_id)
              .maybeSingle();
            name = p?.full_name || "";
            phone = phone || p?.phone || "";
          }
          const to = toWhatsAppNumber(phone);
          if (!to) {
            await supabaseAdmin.from("appointments").update({ reminder_error: "telefone inválido ou ausente" }).eq("id", a.id);
            results.push({ id: a.id, ok: false });
            continue;
          }
          const firstName = (name.trim().split(/\s+/)[0] || "cliente");
          const service = (a.services as { name?: string } | null)?.name || "seu serviço";
          const time = new Date(a.starts_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          });

          const res = await fetch(`${GATEWAY_URL}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": WHATSAPP_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "template",
              template: {
                name: "lembrete_atendimento",
                language: { code: "pt_BR" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: firstName },
                      { type: "text", text: service },
                      { type: "text", text: time },
                    ],
                  },
                ],
              },
            }),
          });
          const body = await res.text();
          if (!res.ok) {
            console.error(`WhatsApp send failed [${res.status}]: ${body}`);
            await supabaseAdmin
              .from("appointments")
              .update({ reminder_error: `[${res.status}] ${body.slice(0, 500)}` })
              .eq("id", a.id);
            results.push({ id: a.id, ok: false });
            continue;
          }
          let messageId: string | null = null;
          try {
            messageId = JSON.parse(body)?.messages?.[0]?.id ?? null;
          } catch {
            /* ignore */
          }
          await supabaseAdmin
            .from("appointments")
            .update({ reminder_message_id: messageId, reminder_error: null })
            .eq("id", a.id);
          sent++;
          results.push({ id: a.id, ok: true });
        }

        return Response.json({ checked: due?.length ?? 0, sent });
      },
    },
  },
});
