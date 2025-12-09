// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.13.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// 🔧 Crée un client Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // ✅ Réponse CORS (préflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { contractA_id, contractB_id } = await req.json();

    if (!contractA_id || !contractB_id) {
      throw new Error("❌ IDs des contrats manquants.");
    }

    // 🔍 Récupère les textes OCR des 2 contrats
    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, title, ocr_text")
      .in("id", [contractA_id, contractB_id]);

    if (error) throw error;
    if (!docs || docs.length < 2)
      throw new Error("Impossible de récupérer les deux contrats.");

    const [contractA, contractB] = docs;

    console.log("📄 Comparaison :", contractA.title, "vs", contractB.title);

    // 🧠 Envoi à OpenAI
    const prompt = `
    Tu es un expert en droit des contrats.
    Compare ces deux contrats de manière claire et concise.

    Contrat A (${contractA.title}):
    ${contractA.ocr_text || "Texte vide"}

    Contrat B (${contractB.title}):
    ${contractB.ocr_text || "Texte vide"}

    Détaille :
    - Les différences majeures (tarifs, clauses, durée, résiliation)
    - Les avantages de chaque contrat
    - Un score de similarité global (%)
    - Une recommandation finale
    Fournis la comparaison en français, sous forme de texte structuré.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un juriste spécialisé en contrats." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const result = completion.choices[0]?.message?.content?.trim();
    if (!result) throw new Error("Réponse IA vide");

    console.log("✅ Comparaison IA générée");

    return new Response(
      JSON.stringify({ comparison: result }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // 👈 autorise toutes les origines
        },
      },
    );
  } catch (err) {
    console.error("❌ Erreur contract-compare:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    );
  }
});
