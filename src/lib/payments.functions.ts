import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Mercado Pago só aceita URLs públicas para retorno e notificação.
const PUBLIC_FALLBACK = "https://project--179389ca-e05c-5a09-bd1e-70fb9ba62a44-dev.lovable.app";

function resolveOrigin() {
  const origin = getRequestHeader("origin") ?? "";
  const host = getRequestHeader("host") ?? "";
  const candidate = origin || (host ? `https://${host}` : "");
  const clean = candidate.replace(/\/$/, "");
  if (!clean || /localhost|127\.0\.0\.1|^http:\/\//.test(clean)) return PUBLIC_FALLBACK;
  return clean;
}

type StartInput = { serviceId: string; professionalId: string; startsAt: string };

export const startDepositCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: StartInput) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const origin = resolveOrigin();

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_min")
      .eq("id", data.serviceId)
      .single();
    if (serviceError || !service) throw new Error("Serviço não encontrado");

    // Confere se o horário ainda está livre, considerando a duração dos serviços.
    const startMs = new Date(data.startsAt).getTime();
    const endMs = startMs + service.duration_min * 60_000;
    const windowStart = new Date(startMs - 8 * 60 * 60_000).toISOString();
    const windowEnd = new Date(endMs + 60_000).toISOString();
    const { data: sameDay } = await supabase
      .from("appointments")
      .select("starts_at, status, created_at, services(duration_min)")
      .eq("professional_id", data.professionalId)
      .neq("status", "cancelled")
      .gte("starts_at", windowStart)
      .lte("starts_at", windowEnd);
    const now = Date.now();
    const conflict = (sameDay ?? []).some((a) => {
      if (a.status === "pending" && now - new Date(a.created_at).getTime() >= 20 * 60_000)
        return false;
      const s = new Date(a.starts_at).getTime();
      const e = s + (a.services?.duration_min ?? 30) * 60_000;
      return startMs < e && endMs > s;
    });
    if (conflict) throw new Error("Este horário acabou de ser reservado. Escolha outro.");

    const { data: settings } = await supabase
      .from("salon_settings")
      .select("deposit_percent")
      .maybeSingle();
    const percent = settings?.deposit_percent ?? 50;
    const deposit = Math.round((service.price_cents * percent) / 100);

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .insert({
        user_id: userId,
        service_id: data.serviceId,
        professional_id: data.professionalId,
        starts_at: data.startsAt,
        total_cents: service.price_cents,
        paid_cents: 0,
        payment_method: "mercadopago",
        status: "pending",
      })
      .select("id")
      .single();
    if (apptError || !appointment) throw new Error("Não foi possível reservar o horário");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error: payError } = await supabaseAdmin
      .from("payments")
      .insert({
        appointment_id: appointment.id,
        user_id: userId,
        kind: "deposit",
        amount_cents: deposit,
        status: "pending",
      })
      .select("id")
      .single();
    if (payError || !payment) throw new Error("Não foi possível iniciar o pagamento");

    const { createPreference } = await import("./mercadopago.server");
    const pref = await createPreference({
      title: `Sinal ${percent}% — ${service.name}`,
      amountCents: deposit,
      externalReference: payment.id,
      origin,
      backUrl: `${origin}/confirmation?id=${appointment.id}`,
      payerEmail: context.claims?.email as string | undefined,
    });

    await supabaseAdmin
      .from("payments")
      .update({ preference_id: pref.id })
      .eq("id", payment.id);

    return { url: pref.initPoint, appointmentId: appointment.id };
  });

export const startBalanceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const origin = resolveOrigin();

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, total_cents, paid_cents, status, services(name)")
      .eq("id", data.appointmentId)
      .single();
    if (error || !appointment) throw new Error("Agendamento não encontrado");
    const remaining = appointment.total_cents - appointment.paid_cents;
    if (remaining <= 0) throw new Error("Este agendamento já está pago");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error: payError } = await supabaseAdmin
      .from("payments")
      .insert({
        appointment_id: appointment.id,
        user_id: userId,
        kind: "balance",
        amount_cents: remaining,
        status: "pending",
      })
      .select("id")
      .single();
    if (payError || !payment) throw new Error("Não foi possível iniciar o pagamento");

    const { createPreference } = await import("./mercadopago.server");
    const pref = await createPreference({
      title: `Saldo restante — ${appointment.services?.name ?? "Serviço"}`,
      amountCents: remaining,
      externalReference: payment.id,
      origin,
      backUrl: `${origin}/appointments`,
      payerEmail: context.claims?.email as string | undefined,
    });

    await supabaseAdmin
      .from("payments")
      .update({ preference_id: pref.id })
      .eq("id", payment.id);

    return { url: pref.initPoint };
  });

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: appointment } = await context.supabase
      .from("appointments")
      .select("id, status, paid_cents, total_cents")
      .eq("id", data.appointmentId)
      .single();
    return appointment ?? null;
  });
