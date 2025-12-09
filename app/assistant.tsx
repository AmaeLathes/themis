import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from './_lib/supabase'; // adapte si ton dossier s'appelle encore "lib"

export default function AssistantScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les contrats de l'utilisateur
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, category')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });
      if (!error) setContracts(data || []);
    })();
  }, []);

  const handleAsk = async () => {
    if (!selectedContract || !question.trim()) return;

    try {
      setLoading(true);
      setAnswer(null);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/faq-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            question,
            contract_id: selectedContract,
          }),
        }
      );

      if (!res.ok) throw new Error('Erreur API Supabase');
      const data = await res.json();
      setAnswer(data.answer);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('❌ Erreur assistant:', err);
      setAnswer('Erreur lors de la réponse. Réessaie plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 🔙 Retour */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={{ fontSize: 16 }}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>💬 Assistant Juridique IA</Text>
      <Text style={styles.subtitle}>Pose une question sur un contrat précis.</Text>

      {/* 🧾 Sélecteur de contrat */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        {contracts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.contractChip,
              selectedContract === c.id && styles.contractChipActive,
            ]}
            onPress={() => setSelectedContract(c.id)}
          >
            <Text
              style={{
                color: selectedContract === c.id ? '#fff' : '#333',
                fontWeight: '600',
              }}
            >
              {c.title.replace('.pdf', '')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ❓ Champ de question */}
      <TextInput
        placeholder="Ex : Puis-je résilier avant un an ?"
        value={question}
        onChangeText={setQuestion}
        style={styles.input}
        multiline
      />

      <TouchableOpacity
        onPress={handleAsk}
        style={[styles.askBtn, (!selectedContract || !question) && { opacity: 0.6 }]}
        disabled={!selectedContract || !question}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>💡 Poser la question</Text>
      </TouchableOpacity>

      {/* 🧠 Réponse */}
      {loading && <ActivityIndicator size="large" color="#1e90ff" style={{ marginTop: 20 }} />}

      {answer && (
        <View style={styles.answerBox}>
          <Text style={styles.answerTitle}>🧠 Réponse de l’assistant :</Text>
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}

      {/* 💬 Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          <Text style={styles.suggestionTitle}>💬 Suggestions :</Text>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => setQuestion(s)}>
              <Text style={styles.suggestionItem}>👉 {s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  backBtn: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#555', marginBottom: 20 },
  contractChip: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  contractChipActive: { backgroundColor: '#1e90ff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  askBtn: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  answerBox: {
    marginTop: 20,
    backgroundColor: '#eef6ff',
    padding: 15,
    borderRadius: 10,
  },
  answerTitle: { fontWeight: '600', fontSize: 16, marginBottom: 6 },
  answerText: { color: '#333', lineHeight: 20 },
  suggestionBox: { marginTop: 20 },
  suggestionTitle: { fontWeight: '600', fontSize: 16, marginBottom: 6 },
  suggestionItem: { color: '#1e90ff', marginBottom: 4 },
});
