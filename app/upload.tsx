import * as DocumentPicker from 'expo-document-picker'
import React, { useEffect, useState } from 'react'
import { Button, FlatList, Image, StyleSheet, Text, View } from 'react-native'
import DropZone from '../components/DropZone'
import { supabase } from './lib/supabase'
import { uploadDocument } from './lib/uploadDocument'

interface FileStatus {
  name: string
  uri: string
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  file?: File // ✅ Optionnel, utile pour le web
}

export default function UploadScreen() {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id || null)
    }
    fetchUser()
  }, [])

  // 📤 Upload unique
  const uploadFile = async (file: FileStatus, index: number) => {
    try {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'uploading', progress: 40 } : f
        )
      )

      const result = await uploadDocument(file.file || file.uri, userId!, 'auto')

      if (result) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, progress: 100, status: 'done' } : f
          )
        )
      } else {
        throw new Error('Erreur upload')
      }
    } catch (err: any) {
      console.error('❌ Upload error:', err.message)
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'error', progress: 0 } : f
        )
      )
    }
  }

  // 🌐 Gestion du drag & drop (Web)
  const handleFilesDrop = async (droppedFiles: File[]) => {
    const newFiles: FileStatus[] = droppedFiles.map((f) => ({
      name: f.name,
      uri: URL.createObjectURL(f),
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      progress: 0,
      status: 'pending',
      file: f, // ✅ on garde le vrai File ici
    }))

    setFiles((prev) => [...prev, ...newFiles])

    newFiles.forEach(async (file, i) => {
      await uploadFile(file, files.length + i)
    })
  }

  // 📱 Gestion du picker (Mobile)
  const handleManualPick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
    })

    if (result.canceled) return

    const pickedFiles: FileStatus[] = result.assets.map((f) => ({
      name: f.name,
      uri: f.uri,
      preview: f.mimeType?.startsWith('image/') ? f.uri : undefined,
      progress: 0,
      status: 'pending',
    }))

    setFiles((prev) => [...prev, ...pickedFiles])

    pickedFiles.forEach(async (file, i) => {
      await uploadFile(file, files.length + i)
    })
  }

  // 🎨 Rendu des fichiers
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
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📁 Drop & Detect</Text>

      {/* Zone de glisser-déposer */}
      <DropZone onFilesDrop={handleFilesDrop} />

      {/* Sélection classique */}
      <Button title="📤 Sélectionner des fichiers" onPress={handleManualPick} />

      {/* Liste fichiers */}
      <FlatList
        data={files}
        keyExtractor={(item) => item.name + item.uri}
        renderItem={renderFile}
        style={{ marginTop: 30, width: '100%' }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
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
