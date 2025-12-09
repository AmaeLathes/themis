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

  const lower = text.toLowerCase();

  // 🔍 Détection automatique de catégorie (plus étendue)
  let categorie = "Autres";
  if (lower.includes("assurance") || lower.includes("mutuelle") || lower.includes("sinistre")) {
    categorie = "Assurance";
  } else if (lower.includes("télécom") || lower.includes("mobile") || lower.includes("forfait") || lower.includes("internet") || lower.includes("fibre")) {
    categorie = "Télécom & Internet";
  } else if (lower.includes("électricité") || lower.includes("edf") || lower.includes("gaz") || lower.includes("énergie") || lower.includes("engie")) {
    categorie = "Énergie & Services";
  } else if (lower.includes("banque") || lower.includes("compte") || lower.includes("crédit") || lower.includes("carte") || lower.includes("prêt")) {
    categorie = "Banque & Finance";
  } else if (lower.includes("bail") || lower.includes("location") || lower.includes("immobilier") || lower.includes("syndic")) {
    categorie = "Location & Immobilier";
  } else if (lower.includes("abonnement") || lower.includes("netflix") || lower.includes("spotify") || lower.includes("prime")) {
    categorie = "Abonnements";
  } else if (lower.includes("contrat de travail") || lower.includes("mission") || lower.includes("prestation")) {
    categorie = "Travail & Freelance";
  } else if (lower.includes("école") || lower.includes("formation") || lower.includes("certificat") || lower.includes("cours")) {
    categorie = "Éducation & Formation";
  } else if (lower.includes("santé") || lower.includes("médecin") || lower.includes("sport") || lower.includes("bien-être")) {
    categorie = "Santé & Bien-être";
  }

  // 🗓️ Extraction de la date
  const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/);
  const date = dateMatch ? dateMatch[0] : "Non détectée";

  // 💶 Extraction du montant
  const montantMatch = text.match(/(\d+[,.]?\d*)\s?(€|euros?)/i);
  const montant = montantMatch ? montantMatch[0] : "Non indiqué";

  // ✂️ Création du résumé
  const firstSentences = text.split(/[.!?]/).slice(0, 2).join(". ").trim();
  const resume =
    firstSentences.length > 300
      ? firstSentences.slice(0, 300) + "…"
      : firstSentences;

  return { categorie, date, montant, resume };
}
