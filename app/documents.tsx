import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { supabase } from './_lib/supabase'

interface DocumentItem {
  id: string
  title: string
  category: string | null
  file_url: string
  created_at: string
  ocr_text: string | null
}

export default function DocumentsList() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()
        const userId = user.user?.id
        if (!userId) return

        const { data, error } = await supabase
          .from('documents')
          .select('id, title, category, file_url, created_at, ocr_text')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setDocs(data || [])
      } catch (err) {
        console.error('❌ Erreur récupération documents:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDocs()
  }, [])

  // 🗑️ Suppression complète
  const handleDelete = async (doc: DocumentItem) => {
    Alert.alert(
      'Supprimer ce contrat ?',
      `Voulez-vous vraiment supprimer "${doc.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1️⃣ Supprimer du Storage
              const path = decodeURIComponent(new URL(doc.file_url).pathname.split('/').slice(-2).join('/'))
              const { error: storageError } = await supabase.storage.from('documents').remove([path])
              if (storageError) console.warn('⚠️ Erreur suppression Storage:', storageError.message)

              // 2️⃣ Supprimer la ligne SQL
              const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id)
              if (dbError) throw dbError

              // 3️⃣ Mise à jour locale
              setDocs(prev => prev.filter(d => d.id !== doc.id))

              console.log('🗑️ Contrat supprimé avec succès')
            } catch (err: any) {
              console.error('❌ Erreur suppression:', err.message)
              Alert.alert('Erreur', "Impossible de supprimer ce contrat.")
            }
          },
        },
      ]
    )
  }

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 100 }} />

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📚 Mes contrats</Text>

      {docs.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 40 }}>Aucun contrat pour l’instant.</Text>
      ) : (
        docs.map((doc) => (
          <View key={doc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{doc.title}</Text>
              <TouchableOpacity onPress={() => handleDelete(doc)}>
                <Text style={styles.deleteBtn}>🗑️</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.date}>
              {new Date(doc.created_at).toLocaleDateString()}
            </Text>

            <Text style={styles.category}>📂 {doc.category || 'Non classé'}</Text>

            <TouchableOpacity
              onPress={() => window.open(doc.file_url, '_blank')}
              style={styles.link}
            >
              <Text style={styles.linkText}>🔗 Ouvrir le fichier</Text>
            </TouchableOpacity>

            <Text numberOfLines={4} style={styles.ocrPreview}>
              {doc.ocr_text
                ? doc.ocr_text.slice(0, 250) + '…'
                : '🧠 Analyse OCR en attente…'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  deleteBtn: { fontSize: 18, color: '#ff4444' },
  date: { color: '#777', fontSize: 13, marginTop: 4 },
  category: { color: '#444', fontSize: 14, marginTop: 4 },
  ocrPreview: { marginTop: 8, color: '#555', fontSize: 14 },
  link: { marginTop: 8 },
  linkText: { color: '#1e90ff', textDecorationLine: 'underline' },
})
