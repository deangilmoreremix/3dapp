import { useCallback } from 'react'

interface UseGestureOptions {
  element: HTMLElement | null
  onZoom?: (delta: number) => void
  onPan?: (dx: number, dy: number) => void
}

export function useGesture({ element, onZoom, onPan }: UseGestureOptions) {
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!onZoom) return
    e.preventDefault()
    const delta = e.deltaY * -0.01
    onZoom(delta)
  }, [onZoom])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Store initial touch position
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onPan) return
    e.preventDefault()
    // Calculate delta from initial position
    const touch = e.touches[0]
    const dx = touch.clientX
    const dy = touch.clientY
    onPan(dx, dy)
  }, [onPan])

  const onTouchEnd = useCallback(() => {
    // Clean up touch tracking
  }, [])

  return {
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}