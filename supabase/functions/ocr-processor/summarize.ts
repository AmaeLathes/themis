export function summarizeOCR(text: string) {
  if (!text || text.length < 50) return "Texte insuffisant pour générer un résumé."

  const lower = text.toLowerCase()
  const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)
  const montantMatch = text.match(/(\d+[,.]?\d*)\s?(€|euros?)/i)
  const categorie =
    lower.includes("assurance") ? "Assurance"
      : lower.includes("banque") ? "Banque"
      : lower.includes("énergie") ? "Énergie"
      : lower.includes("télécom") ? "Télécom"
      : "Autre"

  const firstSentences = text.split(/[.!?]/).slice(0, 2).join(". ").trim()

  return {
    categorie,
    date: dateMatch ? dateMatch[0] : "Non détectée",
    montant: montantMatch ? montantMatch[0] : "Non indiqué",
    resume: firstSentences.slice(0, 300) + "…",
  }
}
