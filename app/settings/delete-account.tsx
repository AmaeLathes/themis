import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Animatable from 'react-native-animatable'
import { supabase } from '../../lib/supabase'

export default function DeleteAccount() {
  const router = useRouter()
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)

  const handleConfirmDelete = async () => {
    try {
      setLoading(true)
      console.log('🧩 Suppression demandée')

      // 🧠 Récupération de l'utilisateur connecté
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log('Suppression lancée pour user:', user?.id)

      if (!user) {
        console.log('❌ Aucun utilisateur connecté')
        return
      }

      // 🪄 Récupération de la clé secrète du webhook
      const webhookKey =
        Constants.expoConfig?.extra?.SECRET_WEBHOOK_KEY ||
        process.env.EXPO_PUBLIC_SECRET_WEBHOOK_KEY
        console.log("🔑 Clé envoyée à Supabase:", webhookKey);


      // ⚡️ Appel à la fonction Edge Supabase
      const response = await fetch(
        'https://frpvwiltdnulzcgbnuoi.functions.supabase.co/delete_user',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${webhookKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Erreur Edge Function:', result.error || 'Erreur inconnue')
        return
      }

      console.log('✅ Compte supprimé côté Supabase:', result)

      // ✅ Déconnexion côté app
      await supabase.auth.signOut()
      console.log('✅ Utilisateur déconnecté')

      // ✅ Animation succès avant redirection
      setSuccessVisible(true)
      setTimeout(() => {
        setModalVisible(false)
        router.replace('/auth/login')
      }, 2500)
    } catch (error: any) {
      console.log('💥 Erreur inattendue:', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supprimer mon compte</Text>
      <Text style={styles.warning}>
        Cette action est définitive. Votre profil sera désactivé immédiatement et supprimé
        ultérieurement conformément au RGPD.
      </Text>

      <TouchableOpacity style={styles.deleteButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.deleteText}>🗑️ Supprimer mon compte</Text>
      </TouchableOpacity>

      {/* 🪟 Modale principale */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="fadeInUp" duration={400} style={styles.modalContainer}>
            {successVisible ? (
              <Animatable.View
                animation="fadeIn"
                duration={400}
                style={styles.successContainer}
              >
                <Animatable.Text
                  animation="bounceIn"
                  duration={1200}
                  style={styles.checkmark}
                >
                  ✅
                </Animatable.Text>
                <Text style={styles.successText}>Compte supprimé avec succès</Text>
              </Animatable.View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirmer la suppression</Text>
                <Text style={styles.modalText}>
                  Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.
                </Text>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Annuler</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalButton, { backgroundColor: '#ff4d4f' }]}
                    onPress={handleConfirmDelete}
                    disabled={loading}
                  >
                    <Text style={styles.modalButtonText}>
                      {loading ? 'Suppression...' : 'Supprimer'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animatable.View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  warning: { textAlign: 'center', color: '#666', marginBottom: 20 },
  deleteButton: { backgroundColor: '#ff4d4f', padding: 14, borderRadius: 8 },
  deleteText: { color: '#fff', fontWeight: 'bold' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: '600' },

  successContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  checkmark: { fontSize: 60, marginBottom: 10 },
  successText: { fontSize: 18, fontWeight: 'bold', color: '#28a745' },
})
