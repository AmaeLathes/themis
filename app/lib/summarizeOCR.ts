
export interface OCRSummary {
  categorie: string
  date: string
  montant: string
  resume: string
}
export function summarizeOCR(text: string): OCRSummary | string {
  if (!text || text.length < 50) {
    return "Texte insuffisant pour générer un résumé.";
  }

  // 🧠 Simplification très basique (à améliorer plus tard avec IA)
  const lower = text.toLowerCase();

  // Recherche d'infos clés
  const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  const montantMatch = text.match(/(\d+[,.]?\d*)\s?(€|euros?)/i);
  const categorie =
    lower.includes("assurance")
      ? "Assurance"
      : lower.includes("banque")
      ? "Banque"
      : lower.includes("électricité") || lower.includes("énergie")
      ? "Énergie"
      : lower.includes("télécom") || lower.includes("mobile")
      ? "Télécom"
      : "Autre";

  // Découpage pour résumé court
  const firstSentences = text.split(/[.!?]/).slice(0, 2).join(". ").trim();

  return {
    categorie,
    date: dateMatch ? dateMatch[0] : "Non détectée",
    montant: montantMatch ? montantMatch[0] : "Non indiqué",
    resume: firstSentences.length > 300 ? firstSentences.slice(0, 300) + "…" : firstSentences,
  };
}
