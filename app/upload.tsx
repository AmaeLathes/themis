import { Picker } from '@react-native-picker/picker'
import * as DocumentPicker from 'expo-document-picker'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from './lib/supabase'
import { uploadDocument } from './lib/uploadDocument'

export default function UploadScreen() {
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('contrat')

  const handleUpload = async () => {
    try {
      // 📁 1️⃣ Sélection du fichier
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.length) {
        Alert.alert('Aucun fichier sélectionné')
        return
      }

      const file = result.assets[0]
      console.log('📄 Fichier sélectionné:', file.name)

      // 👤 2️⃣ Récupération de l’utilisateur connecté
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        Alert.alert('Erreur', 'Utilisateur non connecté.')
        return
      }

      setUploading(true)

      // 🚀 3️⃣ Upload + enregistrement dans Supabase
      const publicUrl = await uploadDocument(file.uri, userId, category, file.name)

      if (publicUrl) {
        Alert.alert('✅ Succès', `Document importé (${category})`)
      } else {
        Alert.alert('❌ Erreur', 'Impossible d’envoyer le document')
      }
    } catch (err: any) {
      console.error('❌ Erreur uploadDocument:', err.message)
      Alert.alert('Erreur', err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📤 Uploader un document</Text>

      <Text style={styles.label}>Catégorie du document :</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Contrat" value="contrat" />
          <Picker.Item label="Facture" value="facture" />
          <Picker.Item label="Devis" value="devis" />
          <Picker.Item label="Autre" value="autre" />
        </Picker>
      </View>

      {uploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Importation en cours...</Text>
        </View>
      ) : (
        <Button title="Sélectionner un fichier" onPress={handleUpload} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: '80%',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
    height: 45,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
  },
})
