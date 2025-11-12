import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from './supabase'

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

export async function uploadDocument(
  file: File | string,
  userId: string,
  category: string
) {
  try {
    let fileName: string
    let fileType: string
    let fileBytes: Uint8Array

    // 🌐 Cas Web
    if (typeof window !== 'undefined' && file instanceof File) {
      fileName = file.name
      fileType = file.type || getMimeType(file.name)

      // on lit directement les bytes du fichier
      const buffer = await file.arrayBuffer()
      fileBytes = new Uint8Array(buffer)
    }

    // 📱 Cas Mobile (URI)
    else if (typeof file === 'string') {
      fileName = file.split('/').pop() || `document_${Date.now()}`
      fileType = getMimeType(fileName)

      const base64Data = await FileSystem.readAsStringAsync(file, {
        encoding: FileSystem.EncodingType.Base64,
      })

      fileBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
    }

    else {
      throw new Error('Format de fichier non reconnu')
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

    // 🧩 Enregistrement BDD
    const { error: insertError } = await supabase.from('documents').insert({
      user_id: userId,
      title: fileName,
      category,
      file_url: publicUrl.publicUrl,
      mime_type: fileType,
    })

    if (insertError) throw insertError

    console.log('✅ Document enregistré :', fileName)
    return publicUrl.publicUrl
  } catch (err: any) {
    console.error('❌ Erreur uploadDocument:', err.message)
    throw new Error(err.message)
  }
}
