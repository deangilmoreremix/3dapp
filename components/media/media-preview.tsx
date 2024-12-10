"use client"

import { useEffect, useState, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useGesture } from '@/hooks/use-gesture'
import { LumaViewer } from './luma-viewer'

interface MediaPreviewProps {
  file: File | null
  zoom: number
  pan: { x: number; y: number }
  isPlaying?: boolean
  className?: string
}

export function MediaPreview({ file, zoom, pan, isPlaying = true, className }: MediaPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null)

  // Setup touch/mouse gestures
  const { onTouchStart, onTouchMove, onTouchEnd, onWheel } = useGesture({
    element: containerRef.current,
    onZoom: (delta) => {
      // Handle zoom gesture
      console.log('Zoom delta:', delta)
    },
    onPan: (dx, dy) => {
      // Handle pan gesture
      console.log('Pan delta:', dx, dy)
    }
  })

  useEffect(() => {
    if (!file) return
    setError(null)
    setIsLoading(true)
    setLoadProgress(0)

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Simulate loading progress
    const interval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsLoading(false)
          return 100
        }
        return prev + 10
      })
    }, 100)

    return () => {
      clearInterval(interval)
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Handle video playback
  useEffect(() => {
    const video = mediaRef.current as HTMLVideoElement
    if (video?.tagName === 'VIDEO') {
      isPlaying ? video.play() : video.pause()
    }
  }, [isPlaying])

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <Progress value={loadProgress} className="w-1/2 mb-2" />
        <p className="text-sm text-neutral-400">Loading... {loadProgress}%</p>
      </div>
    )
  }

  if (!file || !previewUrl) return null

  const isVideo = file.type.startsWith('video/')
  const isModel = file.name.endsWith('.glb') || file.name.endsWith('.gltf') || file.name.endsWith('.zip')
  const transform = `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`

  if (isModel) {
    return <LumaViewer file={file} className={className} />
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={previewUrl}
          className="w-full h-full object-contain transition-transform duration-200"
          style={{ transform }}
          controls={false}
          loop
          muted
          playsInline
          onError={() => setError('Failed to load video')}
        />
      ) : (
        <img
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={previewUrl}
          alt="Preview"
          className="w-full h-full object-contain transition-transform duration-200"
          style={{ transform }}
          onError={() => setError('Failed to load image')}
        />
      )}
    </div>
  )
}