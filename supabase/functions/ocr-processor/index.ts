// supabase/functions/ocr-processor/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { summarizeOCR } from "./summarize.ts"

// ⚙️ Ta clé API OCR.space
const OCR_API_KEY = Deno.env.get("OCR_SPACE_API_KEY") || "helloworld" // ← "helloworld" = clé test gratuite

serve(async (req) => {
  const start = Date.now()

  try {
    const payload = await req.json()
    console.log("📦 Payload reçu :", JSON.stringify(payload, null, 2))

    const file_url = payload?.record?.file_url
    const document_id = payload?.record?.id

    if (!file_url || !document_id) {
      return new Response("❌ Missing parameters", { status: 400 })
    }

    console.log("📤 Envoi du fichier à OCR.space :", file_url)

    // 🔍 Appel API OCR.space
    const formData = new FormData()
    formData.append("url", file_url)
    formData.append("language", "fre")
    formData.append("isOverlayRequired", "false")
    formData.append("OCREngine", "2")
    formData.append("apikey", OCR_API_KEY)

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    })

    const ocrResult = await ocrResponse.json()
    if (!ocrResult || !ocrResult.ParsedResults) {
      console.error("⚠️ OCR.space n’a rien renvoyé :", ocrResult)
      throw new Error("OCR.space: résultat vide ou invalide")
    }

    const ocrText = ocrResult.ParsedResults[0]?.ParsedText || ""
    console.log("✅ OCR terminé. Longueur du texte :", ocrText.length)

    // 📑 Résumé automatique
    const summaryData = summarizeOCR(ocrText)
    const isSummary = typeof summaryData !== "string" ? summaryData : null

    const duration = ((Date.now() - start) / 1000).toFixed(1)
    const logEntry = `[${new Date().toISOString()}] ✅ OCR (OCR.space) ${duration}s
Catégorie : ${isSummary?.categorie || "non détectée"}
Extrait : ${ocrText.slice(0, 120)}...`

    // 💾 Mise à jour du document
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { error } = await supabase
      .from("documents")
      .update({
        ocr_text: ocrText,
        category: isSummary?.categorie || "Non classé",
        signature_date: isSummary?.date ? new Date(isSummary.date) : null,
        processing_log: logEntry,
        status: "analysé",
      })
      .eq("id", document_id)

    if (error) throw error

    console.log("✅ Document analysé et mis à jour.")
    return new Response("✅ OCR.space processing complete", { status: 200 })
  } catch (err) {
    console.error("❌ Erreur OCR.space :", err)
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
})
