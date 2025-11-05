// @ts-nocheck
// Edge Function Supabase — delete_user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // ✅ Gestion CORS (important)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // 🧩 Récupération du corps JSON
    const { user_id } = await req.json();

    // 🧩 Vérif autorisation
    const authHeader = req.headers.get("Authorization");
    const secretKey = Deno.env.get("SECRET_WEBHOOK_KEY");

    if (!authHeader || !secretKey || authHeader !== `Bearer ${secretKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    console.log("🚀 Suppression utilisateur:", user_id);

    // 🧩 Création client admin Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 🧹 Suppression du profil dans `profiles`
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileError) {
      console.error("Erreur suppression profil:", profileError.message);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // 🧹 Suppression du compte utilisateur dans `auth.users`
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error("Erreur suppression utilisateur:", authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    console.log("✅ Utilisateur supprimé avec succès:", user_id);

    return new Response(
      JSON.stringify({ message: "User deleted successfully", user_id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("💥 Erreur Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
