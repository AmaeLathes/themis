import Tesseract from 'tesseract.js'

// 🖼️ Lecture Image (OCR via Tesseract)
export async function extractTextFromImage(fileUri: string): Promise<string> {
  try {
    console.log('🧠 OCR image en cours...')
    const result = await Tesseract.recognize(fileUri, 'fra', {
      logger: (info) => console.log(info),
    })
    console.log('✅ OCR terminé')
    return result.data.text
  } catch (err: any) {
    console.error('❌ Erreur OCR image :', err.message)
    return ''
  }
}

// 🧩 Fonction unifiée (PDF désactivé temporairement)
export async function extractTextFromFile(fileUri: string, mimeType?: string) {
  console.log('⚠️ Lecture PDF désactivée sur web pour stabilité Expo')
  if (mimeType?.includes('image') || /\.(jpg|jpeg|png)$/i.test(fileUri)) {
    return await extractTextFromImage(fileUri)
  }
  return 'PDF non pris en charge dans cette version'
}
