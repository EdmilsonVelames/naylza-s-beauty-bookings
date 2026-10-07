import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Changes the signed-in user's own password. */
export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) => {
    if (typeof data?.password !== "string" || data.password.length < 6 || data.password.length > 72)
      throw new Error("A senha precisa ter entre 6 e 72 caracteres.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (error) {
      if (error.code === "weak_password" || /weak|pwned|guess/i.test(error.message))
        throw new Error("Essa senha é muito fácil de adivinhar. Use uma senha mais forte, misturando letras, números e símbolos.");
      throw new Error("Não foi possível trocar a senha. Tente outra senha.");
    }
    return { ok: true };
  });
