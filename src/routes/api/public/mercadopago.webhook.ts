import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request) {
  let paymentId: string | null = null;
  const url = new URL(request.url);
  paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!paymentId) {
    try {
      const body = (await request.json()) as {
        data?: { id?: string | number };
        type?: string;
        action?: string;
      };
      if (body.data?.id) paymentId = String(body.data.id);
    } catch {
      // ignore
    }
  }

  if (!paymentId) return new Response("ok");

  const { getPayment } = await import("@/lib/mercadopago.server");
  const payment = await getPayment(paymentId);
  if (!payment?.external_reference) return new Response("ok");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("payments")
    .select("id, appointment_id, amount_cents, status")
    .eq("id", payment.external_reference)
    .maybeSingle();
  if (!row) return new Response("ok");

  const approved = payment.status === "approved";
  if (row.status === "approved" || !approved) {
    await supabaseAdmin
      .from("payments")
      .update({
        status: payment.status,
        provider_payment_id: String(payment.id),
        payment_method: payment.payment_method_id ?? "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return new Response("ok");
  }

  await supabaseAdmin
    .from("payments")
    .update({
      status: "approved",
      provider_payment_id: String(payment.id),
      payment_method: payment.payment_method_id ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  const { data: appointment } = await supabaseAdmin
    .from("appointments")
    .select("id, total_cents, paid_cents")
    .eq("id", row.appointment_id)
    .single();
  if (!appointment) return new Response("ok");

  const paid = Math.min(appointment.paid_cents + row.amount_cents, appointment.total_cents);
  await supabaseAdmin
    .from("appointments")
    .update({
      paid_cents: paid,
      status: paid >= appointment.total_cents ? "paid" : "confirmed",
      payment_method: payment.payment_method_id ?? "mercadopago",
    })
    .eq("id", appointment.id);

  return new Response("ok");
}

export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
