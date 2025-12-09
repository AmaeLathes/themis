import * as DocumentPicker from 'expo-document-picker'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Button, FlatList, Image, StyleSheet, Text, View } from 'react-native'
import DropZone from '../components/DropZone'
import { extractTextFromFile } from './_lib/ocrReader'; // ✅ OCR universel (PDF + image)
import { supabase } from './_lib/supabase'
import { uploadDocument } from './_lib/uploadDocument'

interface FileStatus {
  name: string
  uri: string
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  file?: File
}

export default function UploadScreen() {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  // 🔑 Récupération de l'utilisateur connecté Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id || null)
    }
    fetchUser()
  }, [])

  // 📤 Upload + OCR intégré
  const uploadFile = async (file: FileStatus, index: number) => {
    try {
      // MAJ visuelle : envoi en cours
      setFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'uploading', progress: 40 } : f
        )
      )

      // 1️⃣ Upload fichier vers Supabase Storage
      const result = await uploadDocument(file.file || file.uri, userId!, 'auto')
      if (!result) throw new Error('Erreur upload vers Supabase Storage')

      // 2️⃣ OCR : lecture automatique du contenu du fichier
      console.log('🔍 Lecture OCR du fichier en cours...')
      const text = await extractTextFromFile(file.uri, file.file?.type)

      if (text) {
        console.log('📜 Texte OCR détecté (aperçu) :')
        console.log(text.substring(0, 400))
      } else {
        console.log('⚠️ Aucun texte détecté (fichier vide ou non lisible)')
      }

      // 3️⃣ Insertion du document + OCR dans la table "documents"
      if (userId) {
        const { error } = await supabase.from('documents').insert([
          {
            user_id: userId,
            file_name: file.name,
            ocr_text: text || null, // 🧠 colonne réelle de ta BDD
            created_at: new Date().toISOString(),
          },
        ])

        if (error) {
          console.error('⚠️ Erreur insertion Supabase :', error.message)
        } else {
          console.log('✅ Document ajouté à la table "documents" avec texte OCR')
        }
      }

      // 4️⃣ MAJ visuelle
      setFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, progress: 100, status: 'done' } : f
        )
      )
    } catch (err: any) {
      console.error('❌ Erreur upload + OCR :', err.message)
      setFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'error', progress: 0 } : f
        )
      )
    }
  }

  // 🌐 Gestion du drag & drop (web)
  const handleFilesDrop = async (droppedFiles: File[]) => {
    const newFiles: FileStatus[] = droppedFiles.map(f => ({
      name: f.name,
      uri: URL.createObjectURL(f),
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      progress: 0,
      status: 'pending',
      file: f,
    }))

    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(async (file, i) => {
      await uploadFile(file, files.length + i)
    })
  }

  // 📱 Gestion du picker mobile
  const handleManualPick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
    })

    if (result.canceled) return

    const pickedFiles: FileStatus[] = result.assets.map(f => ({
      name: f.name,
      uri: f.uri,
      preview: f.mimeType?.startsWith('image/') ? f.uri : undefined,
      progress: 0,
      status: 'pending',
      file: f as any,
    }))

    setFiles(prev => [...prev, ...pickedFiles])
    pickedFiles.forEach(async (file, i) => {
      await uploadFile(file, files.length + i)
    })
  }

  // 🎨 Rendu d’un fichier
  const renderFile = ({ item }: { item: FileStatus }) => (
    <View style={styles.fileCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {item.preview ? (
          <Image source={{ uri: item.preview }} style={styles.preview} />
        ) : (
          <View style={styles.iconPlaceholder}>
            <Text style={{ fontSize: 20 }}>📄</Text>
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.fileName}>
            {item.status === 'done'
              ? '✅ '
              : item.status === 'error'
              ? '❌ '
              : '⏳ '}
            {item.name}
          </Text>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${item.progress}%`,
                  backgroundColor:
                    item.status === 'done'
                      ? '#4caf50'
                      : item.status === 'error'
                      ? '#ff5555'
                      : '#1e90ff',
                },
              ]}
            />
          </View>

          {item.status === 'done' && (
            <Text style={{ marginTop: 5, fontSize: 12, color: '#666' }}>
              Texte OCR extrait et sauvegardé 🧠
            </Text>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="⬅️ Retour au dashboard" onPress={() => router.replace('/dashboard')} />
      </View>

      <Text style={styles.title}>📁 Drop & Detect</Text>

      <DropZone onFilesDrop={handleFilesDrop} />
      <Button title="📤 Sélectionner des fichiers" onPress={handleManualPick} />

      <FlatList
        data={files}
        keyExtractor={item => item.name + item.uri}
        renderItem={renderFile}
        style={{ marginTop: 30, width: '100%' }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  fileCard: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  fileName: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 5 },
  preview: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#eee' },
  iconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
})
