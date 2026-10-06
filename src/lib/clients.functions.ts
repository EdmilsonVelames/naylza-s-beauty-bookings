import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Apenas a administradora pode fazer isso.");
}

const updateSchema = z.object({
  userId: z.string().uuid(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(6).max(72).optional(),
});

export const adminUpdateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authPatch: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (data.email) {
      authPatch.email = data.email;
      authPatch.email_confirm = true;
    }
    if (data.password) authPatch.password = data.password;
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, authPatch);
      if (error) throw new Error(error.message.includes("already") ? "Este e-mail já está em uso." : "Não foi possível alterar o acesso.");
    }
    const profilePatch: { phone?: string; email?: string } = {};
    if (data.phone !== undefined) profilePatch.phone = data.phone;
    if (data.email) profilePatch.email = data.email;
    if (Object.keys(profilePatch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", data.userId);
      if (error) throw new Error("Não foi possível salvar os dados.");
    }
    return { ok: true };
  });

export const adminDeleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("appointments").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("client_notes").delete().eq("client_key", data.userId);
    await supabaseAdmin.from("professionals").update({ user_id: null }).eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível excluir o cadastro.");
    return { ok: true };
  });

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(255).optional().default(""),
});

/** Staff creates a client account (email optional — a private placeholder is used when empty). */
export const staffCreateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Apenas a equipe do salão pode fazer isso.");
    const email = data.email.toLowerCase();
    if (email && !z.string().email().safeParse(email).success) throw new Error("E-mail inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = data.phone.replace(/\D/g, "") || "sem-telefone";
    const finalEmail = email || `cliente-${digits}-${crypto.randomUUID().slice(0, 8)}@clientes.naylzareis.app`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password: crypto.randomUUID() + "Aa1!",
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error || !created.user) {
      throw new Error(error?.message.includes("already") ? "Este e-mail já está cadastrado." : "Não foi possível criar o cadastro.");
    }
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.name, phone: data.phone, email: email });
    return { userId: created.user.id };
  });
