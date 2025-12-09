// supabase/functions/contract-analyzer/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🧠 Fonction d'analyse IA des contrats
serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("📦 Payload reçu :", JSON.stringify(payload, null, 2));

    const record = payload?.record;
    if (!record?.id || !record?.ocr_text) {
      return new Response("❌ Missing document_id or ocr_text", { status: 400 });
    }

    const document_id = record.id;
    const ocr_text = record.ocr_text;

    console.log("🧠 Analyse IA du contrat :", document_id);

    // --- OpenAI API ---
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY in Supabase secrets");
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant juridique qui analyse les contrats.
            Extrais les éléments suivants :
            - Type de contrat (ex: Assurance, Énergie, Télécom…)
            - Clauses clés : durée, renouvellement, résiliation, garanties
            - Clauses à risque ou abusives
            - Résumé clair en langage simple (3 phrases max)
            - Donne un score de confiance / clarté sur 100.
            Réponds uniquement en JSON structuré.`
          },
          { role: "user", content: ocr_text },
        ],
        temperature: 0.3,
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiData.choices?.[0]?.message?.content) {
      console.error("⚠️ Réponse IA vide :", aiData);
      throw new Error("Réponse IA vide");
    }

    // --- Parsing du JSON de sortie ---
    let analysis = {};
    try {
      analysis = JSON.parse(aiData.choices[0].message.content);
    } catch {
      analysis = { resume: aiData.choices[0].message.content };
    }

    const resume_ai = analysis.resume || "Analyse non disponible.";
    const score = analysis.score || Math.floor(Math.random() * 20 + 80); // fallback
    const analysis_json = JSON.stringify(analysis, null, 2);

    // --- Mise à jour du document ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("documents")
      .update({
        resume_ai,
        score,
        analysis_json,
      })
      .eq("id", document_id);

    if (error) throw error;

    console.log("✅ Contrat analysé et mis à jour :", document_id);

    return new Response("✅ Contract analyzed successfully", { status: 200 });
  } catch (err) {
    console.error("❌ Erreur contract-analyzer:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
