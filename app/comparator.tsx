import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "./_lib/supabase";

export default function ContractComparator() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [contractA, setContractA] = useState<string | null>(null);
  const [contractB, setContractB] = useState<string | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔄 Récupération des contrats
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, category")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (!error) setContracts(data || []);
    })();
  }, []);

  // ⚖️ Comparaison IA
  const handleCompare = async () => {
    if (!contractA || !contractB) return;

    try {
      setLoading(true);
      setComparison(null);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/contract-compare`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            contractA_id: contractA,
            contractB_id: contractB,
          }),
        }
      );

      if (!res.ok) throw new Error("Erreur API comparaison");
      const data = await res.json();
      setComparison(data.comparison);
    } catch (err) {
      console.error("❌ Erreur comparaison:", err);
      setComparison("Erreur lors de la comparaison. Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* 🔙 Retour */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={{ fontSize: 16 }}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>⚖️ Comparateur de contrats</Text>
      <Text style={styles.subtitle}>
        Sélectionne deux contrats à comparer.
      </Text>

      {/* 📄 Sélecteurs de contrats */}
      <Text style={styles.label}>Contrat A</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {contracts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.contractChip,
              contractA === c.id && styles.contractChipActive,
            ]}
            onPress={() => setContractA(c.id)}
          >
            <Text
              style={{
                color: contractA === c.id ? "#fff" : "#333",
                fontWeight: "600",
              }}
            >
              {c.title.replace(".pdf", "")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Contrat B</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {contracts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.contractChip,
              contractB === c.id && styles.contractChipActive,
            ]}
            onPress={() => setContractB(c.id)}
          >
            <Text
              style={{
                color: contractB === c.id ? "#fff" : "#333",
                fontWeight: "600",
              }}
            >
              {c.title.replace(".pdf", "")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 🧠 Bouton de comparaison */}
      <TouchableOpacity
        onPress={handleCompare}
        style={[
          styles.compareBtn,
          (!contractA || !contractB) && { opacity: 0.6 },
        ]}
        disabled={!contractA || !contractB}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          ⚖️ Lancer la comparaison
        </Text>
      </TouchableOpacity>

      {/* 🔄 Chargement */}
      {loading && <ActivityIndicator size="large" color="#1e90ff" style={{ marginTop: 20 }} />}

      {/* 💬 Résultat */}
      {comparison && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>🧾 Résumé de la comparaison</Text>
          <Text style={styles.resultText}>{comparison}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  backBtn: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 6 },
  subtitle: { color: "#555", marginBottom: 20 },
  label: { fontWeight: "600", marginBottom: 6, color: "#333" },
  chipRow: { marginBottom: 20 },
  contractChip: {
    backgroundColor: "#eee",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  contractChipActive: { backgroundColor: "#1e90ff" },
  compareBtn: {
    backgroundColor: "#1e90ff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  resultBox: {
    marginTop: 25,
    backgroundColor: "#eef6ff",
    padding: 15,
    borderRadius: 10,
  },
  resultTitle: { fontWeight: "600", fontSize: 16, marginBottom: 6 },
  resultText: { color: "#333", lineHeight: 20 },
});
