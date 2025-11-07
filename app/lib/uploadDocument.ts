import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from './supabase'

// ⚙️ Détection manuelle du type MIME
const getMimeType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return mimeTypes[extension || ''] || 'application/octet-stream'
}

export async function uploadDocument(uri: string, userId: string, category: string, fileName?: string) {
  try {
    const safeFileName = fileName || `document_${Date.now()}`
    const fileType = getMimeType(safeFileName)

    let fileData: ArrayBuffer | string

    if (typeof window === 'undefined') {
      // 🟢 Mobile (Expo)
      fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
    } else {
      // 💻 Web
      const response = await fetch(uri)
      const blob = await response.blob()
      fileData = await blob.arrayBuffer()
    }

    const fileBytes =
      typeof fileData === 'string'
        ? Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0))
        : new Uint8Array(fileData)

    // 🔼 Upload vers le bucket Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(`${userId}/${safeFileName}`, fileBytes, {
        contentType: fileType,
        upsert: true,
      })

    if (error) throw error

    const { data: publicUrl } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path)

    // 🧩 Insérer le document en base
    const { error: insertError } = await supabase.from('documents').insert({
      user_id: userId,
      title: safeFileName,
      category,
      file_url: publicUrl.publicUrl,
    })

    if (insertError) throw insertError

    return publicUrl.publicUrl
  } catch (err: any) {
    console.error('❌ Erreur uploadDocument:', err.message)
    throw new Error(err.message)
  }
}
