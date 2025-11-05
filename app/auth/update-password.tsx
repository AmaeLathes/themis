import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import type { TextStyle, ViewStyle } from 'react-native'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { supabase } from '../../lib/supabase'

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      console.log('🔍 Vérification de la session...')
      const { data, error } = await supabase.auth.getSession()

      if (error) console.log('❌ getSession error:', error)

      if (data?.session) {
        console.log('✅ Session active détectée')
        setSessionReady(true)
      } else {
        console.log('⚠️ Aucune session détectée, tentative de refresh...')
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) console.log('⚠️ refreshSession error:', refreshError)
        if (refreshData?.session) {
          console.log('✅ Session restaurée via refreshToken')
          setSessionReady(true)
        } else {
          console.log('❌ Aucune session trouvée')
          Toast.show({
            type: 'error',
            text1: 'Lien expiré',
            text2: 'Veuillez redemander un lien de réinitialisation.',
          })
          router.replace('/auth/forgot-password')
        }
      }
    }

    loadSession()
  }, [])

  const handleUpdatePassword = async () => {
    if (!sessionReady) {
      Toast.show({
        type: 'error',
        text1: 'Session manquante',
        text2: 'Veuillez rouvrir le lien de réinitialisation depuis votre email.',
      })
      return
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Mot de passe trop court',
        text2: 'Minimum 6 caractères requis.',
      })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      console.log('❌ Erreur updateUser:', error)
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible de mettre à jour le mot de passe.',
      })
    } else {
      console.log('✅ Mot de passe mis à jour avec succès')
      Toast.show({
        type: 'success',
        text1: 'Mot de passe mis à jour',
        text2: 'Vous pouvez maintenant vous reconnecter.',
      })
      setTimeout(() => {
        router.replace('/auth/login')
      }, 1200)
    }
  }

  if (!sessionReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={{ marginTop: 10 }}>Chargement du lien sécurisé...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Réinitialiser le mot de passe</Text>

      <TextInput
        placeholder="Nouveau mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleUpdatePassword}
        disabled={loading}
        style={[styles.button, loading && { opacity: 0.7 }]}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
const styles: {
  container: ViewStyle
  title: TextStyle
  input: ViewStyle
  button: ViewStyle
  buttonText: TextStyle
  loadingContainer: ViewStyle
} = {
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}
