import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { supabase } from './_lib/supabase'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // L’utilisateur est connecté → redirige vers dashboard
        router.replace('/dashboard')
      } else {
        // Pas connecté → redirige vers la page de login
        router.replace('/auth/login')
      }
    }

    checkSession()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1e90ff" />
      <Text style={{ marginTop: 12, color: '#555' }}>Chargement...</Text>
    </View>
  )
}
