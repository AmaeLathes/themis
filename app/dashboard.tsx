import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Bienvenue ⚖️</Text>
      <Text style={{ color: '#666', marginBottom: 30 }}>{user?.email}</Text>

      <TouchableOpacity
        style={{ backgroundColor: '#ff5555', padding: 12, borderRadius: 8 }}
        onPress={handleLogout}
      >
        <Text style={{ color: '#fff' }}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  )
}
