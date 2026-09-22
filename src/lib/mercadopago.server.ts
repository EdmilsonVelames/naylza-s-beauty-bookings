const API = "https://api.mercadopago.com";

function token() {
  const t = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN ausente");
  return t;
}

export type PreferenceInput = {
  title: string;
  amountCents: number;
  externalReference: string;
  origin: string;
  backUrl: string;
  payerEmail?: string | undefined;
};

export async function createPreference(input: PreferenceInput) {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number((input.amountCents / 100).toFixed(2)),
        },
      ],
      ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
      external_reference: input.externalReference,
      back_urls: {
        success: input.backUrl,
        pending: input.backUrl,
        failure: input.backUrl,
      },
      auto_return: "approved",
      notification_url: `${input.origin}/api/public/mercadopago/webhook`,
      statement_descriptor: "SALAO NAYLZA",
    }),
  });
  const body = (await res.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
  };
  if (!res.ok || !body.init_point) {
    console.error("Mercado Pago preference error", res.status, body);
    throw new Error(body.message ?? "Falha ao criar cobrança no Mercado Pago");
  }
  return { id: body.id ?? "", initPoint: body.init_point };
}

export async function getPayment(paymentId: string) {
  const res = await fetch(`${API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) {
    console.error("Mercado Pago payment lookup failed", res.status);
    return null;
  }
  return (await res.json()) as {
    id: number;
    status: string;
    external_reference?: string;
    payment_method_id?: string;
    transaction_amount?: number;
  };
}
