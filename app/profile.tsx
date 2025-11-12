import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from './lib/supabase'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // 🎯 Charger le profil utilisateur
  useEffect(() => {
    getProfile()
  }, [])

  const getProfile = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) console.error('Erreur chargement profil:', error.message)
    else setProfile(data)
    setLoading(false)
  }

  // 📸 Upload de l’avatar
  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (result.canceled) return

      setUploading(true)
      const file = result.assets[0]
      const fileExt = file.uri.split('.').pop()
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      const response = await fetch(file.uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl.publicUrl })
      Alert.alert('✅ Photo mise à jour !')
    } catch (err: any) {
      console.error('Erreur upload avatar:', err.message)
      Alert.alert('❌ Erreur', err.message)
    } finally {
      setUploading(false)
    }
  }

  // 💾 Sauvegarde du profil
  const handleSave = async () => {
    if (!profile) return
    setLoading(true)

    const updates = {
      full_name: profile.full_name,
      age: profile.age,
      bio: profile.bio,
      job_title: profile.job_title,
      company: profile.company,
      city: profile.city,
      country: profile.country,
      language: profile.language,
      updated_at: new Date(),
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    if (error) Alert.alert('Erreur', error.message)
    else Alert.alert('✅ Profil mis à jour')

    setLoading(false)
  }

  if (!profile) return <ActivityIndicator size="large" color="#1e90ff" />

  const theme = darkMode ? dark : light

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* 🌗 Switch clair/sombre */}
      <View style={styles.themeSwitch}>
        <Text style={{ color: theme.text }}>🌗 Mode sombre</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      {/* 📇 Carte profil */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={handleAvatarUpload}>
          {uploading ? (
            <ActivityIndicator size="small" color="#1e90ff" />
          ) : (
            <Image
              source={{
                uri: profile.avatar_url || 'https://placekitten.com/200/200',
              }}
              style={styles.avatar}
            />
          )}
        </TouchableOpacity>

        {/* Bouton explicite pour changer la photo */}
        <TouchableOpacity onPress={handleAvatarUpload} style={styles.avatarBtn}>
          <Text style={{ color: '#1e90ff', fontWeight: '600' }}>
            📸 Changer ma photo
          </Text>
        </TouchableOpacity>

        <Text style={[styles.name, { color: theme.text }]}>
          {profile.full_name || 'Utilisateur'}
        </Text>
        <Text style={[styles.email, { color: theme.textLight }]}>
          {profile.language || 'Français'}
        </Text>
      </View>

      {/* ✍️ Formulaire infos perso */}
      <View style={styles.form}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Nom complet"
          placeholderTextColor={theme.textLight}
          value={profile.full_name || ''}
          onChangeText={(t) => setProfile({ ...profile, full_name: t })}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Âge"
          placeholderTextColor={theme.textLight}
          keyboardType="numeric"
          value={profile.age ? String(profile.age) : ''}
          onChangeText={(t) => setProfile({ ...profile, age: parseInt(t) || null })}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Poste / Profession"
          placeholderTextColor={theme.textLight}
          value={profile.job_title || ''}
          onChangeText={(t) => setProfile({ ...profile, job_title: t })}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Entreprise / Organisation"
          placeholderTextColor={theme.textLight}
          value={profile.company || ''}
          onChangeText={(t) => setProfile({ ...profile, company: t })}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Ville"
          placeholderTextColor={theme.textLight}
          value={profile.city || ''}
          onChangeText={(t) => setProfile({ ...profile, city: t })}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Pays"
          placeholderTextColor={theme.textLight}
          value={profile.country || ''}
          onChangeText={(t) => setProfile({ ...profile, country: t })}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, height: 80 }]}
          placeholder="Bio"
          placeholderTextColor={theme.textLight}
          multiline
          value={profile.bio || ''}
          onChangeText={(t) => setProfile({ ...profile, bio: t })}
        />
      </View>

      {/* 💾 Bouton sauvegarde */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: darkMode ? '#3b82f6' : '#1e90ff' }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveText}>{loading ? '💾 Sauvegarde...' : 'Enregistrer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const light = {
  bg: '#f5f7fa',
  card: '#fff',
  text: '#222',
  textLight: '#555',
  border: '#ccc',
}

const dark = {
  bg: '#121212',
  card: '#1f1f1f',
  text: '#f5f5f5',
  textLight: '#bbb',
  border: '#333',
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 20 },
  themeSwitch: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  card: {
    width: '90%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: 20,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  avatarBtn: { marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '600' },
  email: { fontSize: 14, marginBottom: 5 },
  form: { width: '90%' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 50,
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
