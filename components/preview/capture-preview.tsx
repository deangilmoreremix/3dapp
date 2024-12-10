"use client"

import { useEffect, useState, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThreeViewer } from '../three-viewer'

interface CapturePreviewProps {
  file: File | null
  className?: string
}

export function CapturePreview({ file, className }: CapturePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'video' | 'model' | null>(null)

  const createPreviewUrl = useCallback((file: File) => {
    try {
      return URL.createObjectURL(file)
    } catch (err) {
      setError('Failed to create preview')
      return null
    }
  }, [])

  useEffect(() => {
    if (!file) return

    setError(null)
    setFileType(null)

    // Determine file type
    if (file.type.startsWith('image/')) {
      setFileType('image')
    } else if (file.type.startsWith('video/')) {
      setFileType('video')
    } else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf') || file.name.endsWith('.zip')) {
      setFileType('model')
    }
    
    if (fileType !== 'model') {
      const url = createPreviewUrl(file)
      setPreviewUrl(url)
    }

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [file, createPreviewUrl, fileType])

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!file) return null

  if (fileType === 'model') {
    return <ThreeViewer className={className} />
  }

  if (fileType === 'video') {
    return (
      <video
        src={previewUrl || undefined}
        className={cn("w-full h-full object-contain", className)}
        controls
        autoPlay
        loop
        muted
        onError={() => setError('Failed to load video preview')}
      />
    )
  }

  if (fileType === 'image') {
    return (
      <img
        src={previewUrl || undefined}
        alt="Preview"
        className={cn("w-full h-full object-contain", className)}
        onError={() => setError('Failed to load image preview')}
      />
    )
  }

  return (
    <Alert variant="destructive" className="m-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>Unsupported file type</AlertDescription>
    </Alert>
  )
}