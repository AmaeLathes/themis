// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.13.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // ✅ Gestion du préflight CORS
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
    const { contract_id, question } = await req.json();

    if (!contract_id || !question)
      throw new Error("Paramètres manquants (contract_id, question)");

    // 🔍 Récupère le texte OCR du contrat demandé
    const { data: doc, error } = await supabase
      .from("documents")
      .select("title, ocr_text")
      .eq("id", contract_id)
      .single();

    if (error || !doc) throw new Error("Contrat introuvable");

    // 🧠 Demande à OpenAI une réponse ciblée
    const prompt = `
    Tu es un assistant juridique spécialisé en lecture de contrats.
    Réponds à la question de l'utilisateur sur ce contrat de manière claire, concise, et en français.

    Contrat : ${doc.title}

    Texte du contrat :
    ${doc.ocr_text || "Aucun texte trouvé"}

    Question de l'utilisateur :
    "${question}"
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un juriste assistant intelligent." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) throw new Error("Réponse IA vide");

    console.log("✅ Réponse IA générée pour la FAQ");

    return new Response(
      JSON.stringify({ answer: response }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("❌ Erreur FAQ assistant:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    );
  }
});
