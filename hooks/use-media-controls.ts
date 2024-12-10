import { useState, useCallback } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.2

export function useMediaControls() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPlaying, setIsPlaying] = useState(true)

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const updatePan = useCallback((dx: number, dy: number) => {
    setPan(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }))
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  return {
    zoom,
    pan,
    isPlaying,
    zoomIn,
    zoomOut,
    resetView,
    updatePan,
    togglePlay
  }
}