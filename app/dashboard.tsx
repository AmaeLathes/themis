import { useRouter } from "expo-router"
import { MotiView } from "moti"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import Toast from "react-native-toast-message"
import { OCRSummary, summarizeOCR } from "./_lib/summarizeOCR"
import { supabase } from "./_lib/supabase"

interface DocumentItem {
  id: string
  title: string
  category: string
  file_url: string
  created_at: string
  ocr_text?: string | null
  ocr_summary?: OCRSummary | string | null
  resume_ai?: string | null
  score?: number | null
  analysis_json?: string | object | null
}

const CATEGORIES = [
  "Tous",
  "Assurance",
  "Télécom & Internet",
  "Énergie & Services",
  "Banque & Finance",
  "Location & Immobilier",
  "Abonnements",
  "Santé & Bien-etre",
  "Autres",
]

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [filteredDocs, setFilteredDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("Tous")
  const [searchQuery, setSearchQuery] = useState("")
  const [darkMode, setDarkMode] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null)
  const [showAiModal, setShowAiModal] = useState(false)
  const [selectedResumeAi, setSelectedResumeAi] = useState<string | null>(null)

  const theme = darkTheme

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
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) console.error("❌ Erreur chargement documents:", error.message)
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

    if (category !== "Tous") {
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
    router.replace("/auth/login")
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

      const path = decodeURIComponent(
        new URL(doc.file_url).pathname.split("/").slice(-2).join("/")
      )
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([path])
      if (storageError)
        console.warn("⚠️ Erreur suppression storage:", storageError.message)

      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id)
      if (dbError) throw dbError

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      setFilteredDocs((prev) => prev.filter((d) => d.id !== doc.id))

      Toast.show({
        type: "success",
        text1: "Document supprimé ✅",
        position: "bottom",
      })
    } catch (err: any) {
      console.error("❌ Erreur suppression document:", err.message)
      Toast.show({
        type: "error",
        text1: "Erreur lors de la suppression ⚠️",
      })
    } finally {
      setDocToDelete(null)
    }
  }

  const renderDocument = ({ item }: { item: DocumentItem }) => {
    const summary = item.ocr_text ? summarizeOCR(item.ocr_text) : null
    const isValidSummary = summary && typeof summary !== "string"

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 500 }}
        style={[
          styles.docCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => handleOpenDocument(item.file_url)}>
            <Text style={[styles.docTitle, { color: theme.text }]}>
              📄 {item.title}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => confirmDeleteDocument(item)}>
            <Text style={{ color: "#ff5252", fontSize: 18 }}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.docDate, { color: theme.muted }]}>
          {new Date(item.created_at).toLocaleDateString("fr-FR")}
        </Text>

        {isValidSummary && (
          <View style={styles.blockSection}>
            <Text style={[styles.blockTitle, { color: theme.text }]}>
              🧠 Résumé OCR
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              {summary.resume}
            </Text>
          </View>
        )}

        {/* 💼 Bouton pour afficher l’analyse IA */}
        {(item.resume_ai || item.analysis_json) && (
          <TouchableOpacity
            style={{
              marginTop: 10,
              paddingVertical: 10,
              backgroundColor:
                theme.bg === '#fff' ? '#e3f2fd' : '#1a237e',
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => {
              setSelectedResumeAi(
                item.analysis_json
                  ? JSON.stringify(item.analysis_json)
                  : item.resume_ai || null
              )
              setShowAiModal(true)
            }}
          >
            <Text
              style={{
              color: theme.bg === '#fff' ? '#0d47a1' : '#90caf9',
              fontWeight: 'bold',
            }}
          >
            💼 Voir l’analyse IA complète
            </Text>
          </TouchableOpacity>
        )}

      </MotiView>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* 🔝 Navbar */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 600 }}
        style={[styles.navbar, { backgroundColor: theme.navbar }]}
      >
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Text style={[styles.navLink, { color: "#fff" }]}>👤 Profil</Text>
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: "#fff" }]}>⚖️ Themis</Text>

        <TouchableOpacity onPress={handleLogout}>
          <Text style={[styles.navLink, { color: "#fff" }]}>🚪</Text>
        </TouchableOpacity>
      </MotiView>

      <Text style={[styles.title, { color: "#fff" }]}>
        Bienvenue sur ton tableau de bord
      </Text>
      <Text style={[styles.subtitle, { color: "#9e9e9e" }]}>{user?.email}</Text>

      <TouchableOpacity
        style={[styles.uploadBtn, { backgroundColor: "#00bcd4" }]}
        onPress={() => router.push("/upload")}
      >
        <Text style={[styles.uploadText, { color: "#fff" }]}>
          📤 Importer un document
        </Text>
      </TouchableOpacity>

      {/* 📊 Boutons IA */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <TouchableOpacity
          style={[styles.featureBtn, { backgroundColor: "#2196f3" }]}
          onPress={() => router.push("/assistant")}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>💬 Assistant IA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureBtn, { backgroundColor: "#263238" }]}
          onPress={() => router.push("/comparator")}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>⚖️ Comparer</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Recherche */}
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.card }]}
        placeholder="🔍 Rechercher un document..."
        placeholderTextColor="#aaa"
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
                  activeCategory === cat ? "#00bcd4" : theme.card,
              },
            ]}
            onPress={() => handleFilter(cat)}
          >
            <Text
              style={{
                color: activeCategory === cat ? "#fff" : "#b0bec5",
                fontWeight: "600",
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📂 Liste */}
      {loading ? (
        <ActivityIndicator color="#00bcd4" size="large" style={{ marginTop: 20 }} />
      ) : filteredDocs.length === 0 ? (
        <Text style={[styles.emptyText, { color: "#9e9e9e" }]}>
          Aucun document trouvé 📭
        </Text>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={renderDocument}
          numColumns={2}
          columnWrapperStyle={{
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 10,
        }}
        contentContainerStyle={{
        paddingHorizontal: 10,
        paddingBottom: 40,
      }}
      scrollEnabled={false}
/>
      )}

      {/* 🧠 Modal IA */}
      <Modal
        visible={showAiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.aiModalBox, { backgroundColor: "#1e1e1e" }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>💼 Analyse IA complète</Text>
              <Text style={{ color: "#b0bec5", marginBottom: 10 }}>
                {selectedResumeAi}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#00bcd4" }]}
              onPress={() => setShowAiModal(false)}
            >
              <Text style={{ color: "#fff", textAlign: "center" }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🗑️ Modal Confirmation Suppression */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 300 }}
            style={[styles.confirmBox, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.modalTitle, { color: "#fff" }]}>
              Supprimer ce document ?
            </Text>
            <Text style={{ color: "#b0bec5", marginVertical: 10, textAlign: "center" }}>
              Cette action est irréversible.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#455a64" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#fff" }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#e53935" }]}
                onPress={handleDeleteConfirmed}
              >
                <Text style={{ color: "#fff" }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </Modal>

      <Toast />
    </ScrollView>
  )
}

const darkTheme = {
  bg: "#0d0f12",
  card: "#1b1f24",
  border: "#263238",
  navbar: "#10141a",
  text: "#ffffff",
  textSecondary: "#b0bec5",
  muted: "#78909c",
  secondary: "#263238",
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 80, alignItems: "center" },
  navbar: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  navLink: { fontWeight: "600", fontSize: 16 },
  navTitle: { fontWeight: "bold", fontSize: 18 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginTop: 10 },
  subtitle: { textAlign: "center", marginBottom: 25 },
  uploadBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 20,
  },
  uploadText: { fontWeight: "bold", fontSize: 15 },
  featureBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  searchInput: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "90%",
    marginBottom: 20,
    color: "#fff",
  },
  filterBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  docCard: {
    flex: 1,
    width: 320,
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
    minWidth: "48%",
    maxWidth: "48%",
    borderWidth: 1,
    flexGrow: 1,
    alignSelf: "flex-start",
  },
  docTitle: { fontWeight: "bold", fontSize: 16 },
  docDate: { marginTop: 2, fontSize: 12 },
  blockSection: { marginTop: 8 },
  blockTitle: { fontWeight: "700", marginBottom: 4 },
  scoreBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#00bcd4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyText: { textAlign: "center", marginTop: 20, fontStyle: "italic" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiModalBox: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  confirmBox: {
    width: 300,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
})
