import React, { useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity } from 'react-native'
import { supabase } from './lib/supabase'

export default function DocumentsList() {
  const [docs, setDocs] = useState<any[]>([])

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase.storage.from('documents').list()
      if (!error) setDocs(data)
    }
    fetchDocs()
  }, [])

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>📚 Mes documents</Text>
      {docs.map((doc, idx) => (
        <TouchableOpacity key={idx} style={{ marginVertical: 10 }}>
          <Text>📄 {doc.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}
