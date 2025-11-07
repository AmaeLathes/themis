import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from './lib/supabase'





export default function Profile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getProfile()
  }, [])

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single()
    if (error) Alert.alert('Erreur', error.message)
    else setProfile(data)
    setLoading(false)
    console.log("Profil chargé:", data)

  }

  const updateProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        language: profile.language,
      })
      .eq('id', profile.id )
    if (error) Alert.alert('Erreur', error.message)
    else Alert.alert('Profil mis à jour ✅')
  }

  if (loading) return <Text>Chargement...</Text>

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon profil</Text>

      <TextInput
        style={styles.input}
        value={profile?.full_name}
        onChangeText={(t) => setProfile({ ...profile, full_name: t })}
        placeholder="Nom complet"
      />
      <TextInput
        style={styles.input}
        value={profile?.language}
        onChangeText={(t) => setProfile({ ...profile, language: t })}
        placeholder="Langue (fr/en)"
      />

      <TouchableOpacity style={styles.button} onPress={updateProfile}>
        <Text style={styles.buttonText}>Sauvegarder</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/settings/delete-account')}>
        <Text style={{ color: 'red', marginTop: 20 }}>🗑️ Supprimer mon compte</Text>
      </TouchableOpacity>

    </View>

  )


}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#1e90ff', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
})
