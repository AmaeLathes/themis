import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void
}

export default function DropZone({ onFilesDrop }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        onFilesDrop(Array.from(files))
      }
    },
    [onFilesDrop]
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const dropZone = document.getElementById('drop-zone')
    if (!dropZone) return

    dropZone.addEventListener('dragover', handleDragOver)
    dropZone.addEventListener('dragleave', handleDragLeave)
    dropZone.addEventListener('drop', handleDrop)

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver)
      dropZone.removeEventListener('dragleave', handleDragLeave)
      dropZone.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDragLeave, handleDrop])

  return (
    <View
      id="drop-zone"
      style={[styles.zone, isDragging ? styles.zoneActive : styles.zoneInactive]}
    >
      <Text style={styles.text}>
        {isDragging
          ? '📂 Déposez vos fichiers ici...'
          : '📁 Glissez plusieurs documents ou cliquez pour en importer'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  zone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 20,
  },
  zoneInactive: {
    borderColor: '#aaa',
    backgroundColor: '#fafafa',
  },
  zoneActive: {
    borderColor: '#1e90ff',
    backgroundColor: '#e8f4ff',
  },
  text: {
    color: '#555',
    textAlign: 'center',
    fontSize: 16,
  },
})
