import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../_lib/supabase'

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async () => {
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else router.replace('/dashboard')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>S’inscrire</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/auth/login')}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#1e90ff', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  link: { color: '#1e90ff', marginTop: 10, textAlign: 'center' },
  error: { color: 'red', marginBottom: 10 },
})
