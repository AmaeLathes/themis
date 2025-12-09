import { Platform } from 'react-native'
import { supabase } from './supabase'

// 💡 Certains environnements Expo n'ont pas FileSystem sur le web
let FileSystem: any
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system')
}

const getMimeType = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return types[ext || ''] || 'application/octet-stream'
}

interface PickerFile {
  uri: string
  name?: string
  mimeType?: string
}

export async function uploadDocument(
  file: File | string | PickerFile,
  userId: string,
  category: string
) {
  try {
    let fileName = `document_${Date.now()}`
    let fileType = 'application/octet-stream'
    let fileBytes: Uint8Array

    // 🌐 WEB (drag & drop)
    if (Platform.OS === 'web' && file instanceof File) {
      fileName = file.name
      fileType = file.type || getMimeType(fileName)
      const buffer = await file.arrayBuffer()
      fileBytes = new Uint8Array(buffer)
    }

    // 🌐 WEB (DocumentPicker blob URI)
    else if (Platform.OS === 'web' && typeof file === 'object' && 'uri' in file && file.uri.startsWith('blob:')) {
      const response = await fetch(file.uri)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      fileName = file.name || `document_${Date.now()}`
      fileType = file.mimeType || blob.type || getMimeType(fileName)
      fileBytes = new Uint8Array(buffer)
    }

    // 📱 MOBILE (URI file path)
    else if (typeof file === 'string' || (typeof file === 'object' && 'uri' in file && file.uri.startsWith('file:'))) {
      const uri = typeof file === 'string' ? file : file.uri
      fileName = (typeof file === 'object' && file.name) || uri.split('/').pop() || `document_${Date.now()}`
      fileType = (typeof file === 'object' && file.mimeType) || getMimeType(fileName)
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      fileBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
    }

    else {
      console.error('📦 Type reçu :', file)
      throw new Error('Format de fichier non reconnu pour uploadDocument')
    }

    // 🔼 Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(`${userId}/${fileName}`, fileBytes, {
        contentType: fileType,
        upsert: true,
      })

    if (error) throw error

    const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(data.path)
    const fileUrl = publicUrl?.publicUrl || ''

    // 🧩 Enregistrement dans la table documents
    const { error: insertError } = await supabase.from('documents').insert({
      user_id: userId,
      title: fileName,
      category,
      file_url: fileUrl,
      mime_type: fileType,
    })

    if (insertError) throw insertError

    console.log('✅ Document enregistré :', fileName)
    return fileUrl
  } catch (err: any) {
    console.error('❌ Erreur uploadDocument:', err.message)
    throw err
  }
}
