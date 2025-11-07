import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from './lib/supabase'

interface DocumentItem {
  id: string
  title: string
  category: string
  file_url: string
  created_at: string
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

  const renderDocument = ({ item }: { item: DocumentItem }) => (
    <TouchableOpacity
      style={[styles.docCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleOpenDocument(item.file_url)}
    >
      <Text style={[styles.docTitle, { color: theme.text }]}>📄 {item.title}</Text>
      <Text style={[styles.docCategory, { color: theme.textSecondary }]}>
        Catégorie : {item.category}
      </Text>
      <Text style={[styles.docDate, { color: theme.muted }]}>
        {new Date(item.created_at).toLocaleDateString('fr-FR')}
      </Text>
    </TouchableOpacity>
  )

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🌐 NAVBAR */}
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
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{user?.email}</Text>

      {/* 📤 Import de document */}
      <TouchableOpacity
        style={[styles.uploadBtn, { backgroundColor: theme.button }]}
        onPress={() => router.push('/upload')}
      >
        <Text style={[styles.uploadText, { color: theme.buttonText }]}>
          📤 Importer un document
        </Text>
      </TouchableOpacity>

      {/* 🔍 Barre de recherche */}
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
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

      {/* 📂 Liste des documents */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Mes documents</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
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
  container: {
    padding: 20,
    paddingTop: 80,
    alignItems: 'center',
  },
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
  navLink: {
    fontWeight: '600',
    fontSize: 16,
  },
  navTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
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
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
})
