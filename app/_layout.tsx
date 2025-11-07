import { useColorScheme } from '@/components/useColorScheme'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import 'react-native-reanimated'
import Toast from 'react-native-toast-message'
import { supabase } from './lib/supabase'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: 'dashboard',
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) return null

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const router = useRouter()
  const segments = useSegments()
  const [session, setSession] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)

  // 🧠 Récupère la session Supabase
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setIsReady(true)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // 🚦 Contrôle de navigation
  useEffect(() => {
    if (!isReady) return

    const inAuthGroup = (segments[0] as string) === 'auth'
    // segments may be a tuple of length 1, so read index 1 safely and allow undefined
    const currentSegment = (segments as string[])[1]

    // ✅ Autorise explicitement /auth/update-password même si une session existe
    const isUpdatePasswordPage = currentSegment === 'update-password'

    // ✅ Autorise aussi si l’URL contient type=recovery (depuis email Supabase)
    const isRecoveryFlow =
      typeof window !== 'undefined' && window.location.href.includes('type=recovery')

    if (!session && !inAuthGroup) {
      // Non connecté → redirige vers login
      router.replace('/auth/login')
    } else if (
      session &&
      inAuthGroup &&
      !isUpdatePasswordPage &&
      !isRecoveryFlow
    ) {
      // Connecté → empêche d’aller sur /auth/... sauf pour update-password
      router.replace('/dashboard')
    }
  }, [isReady, session, segments])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      {/* ✅ Composant global pour afficher les Toasts */}
      <Toast />
    </ThemeProvider>
  )
}
