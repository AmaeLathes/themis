import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { OCRSummary, summarizeOCR } from './lib/summarizeOCR'; // ✅ résumé OCR
import { supabase } from './lib/supabase'

interface DocumentItem {
  id: string
  title: string
  category: string
  file_url: string
  created_at: string
  ocr_text?: string | null
  ocr_summary?: OCRSummary | string | null
}

const CATEGORIES = ['Tous', 'Contrats', 'Devis', 'Factures', 'Autres']

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [filteredDocs, setFilteredDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null)

  const theme = darkMode ? darkTheme : lightTheme

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchDocuments = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) console.error('❌ Erreur chargement documents:', error.message)
      else {
        setDocuments(data || [])
        setFilteredDocs(data || [])
      }
      setLoading(false)
    }

    fetchDocuments()
  }, [user])

  const handleFilter = (category: string) => {
    setActiveCategory(category)
    filterDocuments(searchQuery, category)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    filterDocuments(query, activeCategory)
  }

  const filterDocuments = (query: string, category: string) => {
    let filtered = documents

    if (category !== 'Tous') {
      filtered = filtered.filter((doc) => doc.category === category)
    }

    if (query.trim()) {
      filtered = filtered.filter((doc) =>
        doc.title.toLowerCase().includes(query.toLowerCase())
      )
    }

    setFilteredDocs(filtered)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const handleOpenDocument = async (url: string) => {
    try {
      await Linking.openURL(url)
    } catch {
      alert("Impossible d'ouvrir le document")
    }
  }

  // 🗑️ Supprimer un document
  const confirmDeleteDocument = (doc: DocumentItem) => {
    setDocToDelete(doc)
    setModalVisible(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!docToDelete) return

    try {
      const doc = docToDelete
      setModalVisible(false)

      // Supprimer du Storage
      const path = decodeURIComponent(
        new URL(doc.file_url).pathname.split('/').slice(-2).join('/')
      )
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([path])
      if (storageError)
        console.warn('⚠️ Erreur suppression storage:', storageError.message)

      // Supprimer de la table
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
      if (dbError) throw dbError

      // Mise à jour locale
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      setFilteredDocs((prev) => prev.filter((d) => d.id !== doc.id))

      Toast.show({
        type: 'success',
        text1: 'Document supprimé ✅',
        position: 'bottom',
      })
    } catch (err: any) {
      console.error('❌ Erreur suppression document:', err.message)
      Toast.show({
        type: 'error',
        text1: 'Erreur lors de la suppression ⚠️',
      })
    } finally {
      setDocToDelete(null)
    }
  }

  const renderDocument = ({ item }: { item: DocumentItem }) => {
    const summary = item.ocr_text ? summarizeOCR(item.ocr_text) : null
    const isValidSummary = summary && typeof summary !== 'string'

    return (
      <View
        style={[
          styles.docCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => handleOpenDocument(item.file_url)}>
            <Text style={[styles.docTitle, { color: theme.text }]}>
              📄 {item.title}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => confirmDeleteDocument(item)}>
            <Text style={{ color: '#ff4444', fontSize: 18 }}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.docCategory, { color: theme.textSecondary }]}>
          Catégorie : {item.category || 'Non classé'}
        </Text>

        <Text style={[styles.docDate, { color: theme.muted }]}>
          {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>

        {isValidSummary && (
          <View
            style={{
              marginTop: 8,
              padding: 8,
              backgroundColor:
                theme.background === '#fff' ? '#f0f0f0' : '#2a2a2a',
              borderRadius: 6,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: '600' }}>
              🧠 Résumé OCR :
            </Text>
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
              Catégorie détectée : {summary.categorie}
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              Date détectée : {summary.date}
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              Montant détecté : {summary.montant}
            </Text>
            <Text style={{ color: theme.textSecondary, marginTop: 6 }}>
              {summary.resume}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      {/* 🔝 Navbar */}
      <View style={[styles.navbar, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Text style={[styles.navLink, { color: theme.navText }]}>👤 Profil</Text>
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: theme.navText }]}>⚖️ Themis</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.navText }}>{darkMode ? '🌙' : '☀️'}</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            thumbColor={darkMode ? '#fff' : '#1e90ff'}
            trackColor={{ false: '#ccc', true: '#1976d2' }}
          />
          <TouchableOpacity onPress={handleLogout}>
            <Text style={[styles.navLink, { color: theme.navText }]}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>
        Bienvenue sur ton tableau de bord
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {user?.email}
      </Text>

      {/* 📤 Import */}
      <TouchableOpacity
        style={[styles.uploadBtn, { backgroundColor: theme.button }]}
        onPress={() => router.push('/upload')}
      >
        <Text style={[styles.uploadText, { color: theme.buttonText }]}>
          📤 Importer un document
        </Text>
      </TouchableOpacity>

      {/* 🔍 Recherche */}
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder="🔍 Rechercher un document..."
        placeholderTextColor={theme.muted}
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {/* 🗂️ Filtres */}
      <View style={styles.filterBar}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  activeCategory === cat ? theme.primary : theme.card,
                borderColor:
                  activeCategory === cat ? theme.primary : theme.border,
              },
            ]}
            onPress={() => handleFilter(cat)}
          >
            <Text
              style={{
                color: activeCategory === cat ? '#fff' : theme.text,
                fontWeight: activeCategory === cat ? 'bold' : '500',
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📂 Liste */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={{ marginTop: 20 }}
        />
      ) : filteredDocs.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Aucun document trouvé 📭
        </Text>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={renderDocument}
          scrollEnabled={false}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}
        />
      )}

      {/* 🔔 Modal Confirmation */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Supprimer ce document ?
            </Text>
            <Text style={{ color: theme.textSecondary, marginVertical: 10 }}>
              Cette action est irréversible.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ccc' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ff4444' }]}
                onPress={handleDeleteConfirmed}
              >
                <Text style={{ color: '#fff' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </ScrollView>
  )
}

const lightTheme = {
  background: '#fff',
  text: '#222',
  textSecondary: '#555',
  muted: '#888',
  card: '#f9f9f9',
  border: '#ddd',
  button: '#1e90ff',
  buttonText: '#fff',
  primary: '#1e90ff',
  navText: '#fff',
}

const darkTheme = {
  background: '#121212',
  text: '#f1f1f1',
  textSecondary: '#ccc',
  muted: '#888',
  card: '#1e1e1e',
  border: '#333',
  button: '#1976d2',
  buttonText: '#fff',
  primary: '#0d47a1',
  navText: '#fff',
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 80, alignItems: 'center' },
  navbar: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
    elevation: 5,
  },
  navLink: { fontWeight: '600', fontSize: 16 },
  navTitle: { fontWeight: 'bold', fontSize: 18 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  subtitle: { textAlign: 'center', marginBottom: 25 },
  uploadBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    width: 220,
  },
  uploadText: { fontWeight: 'bold', fontSize: 15 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '90%',
    marginBottom: 20,
    fontSize: 15,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  docCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    width: 300,
  },
  docTitle: { fontWeight: 'bold', fontSize: 16 },
  docCategory: { marginTop: 4 },
  docDate: { marginTop: 2, fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: { width: 300, borderRadius: 10, padding: 20 },
  modalTitle: { fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
})
