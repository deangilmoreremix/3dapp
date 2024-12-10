"use client"

import { useEffect, useRef } from 'react'
import { setupThreeScene, handleResize, createBasicMesh } from '@/lib/three-utils'

interface ThreeViewerProps {
  className?: string
}

export function ThreeViewer({ className }: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // Setup Three.js scene
    const { scene, camera, renderer, controls, dispose } = setupThreeScene({
      canvas,
      width: container.clientWidth,
      height: container.clientHeight
    })

    // Add test mesh
    const mesh = createBasicMesh()
    scene.add(mesh)

    // Animation loop
    let animationFrameId: number
    function animate() {
      animationFrameId = requestAnimationFrame(animate)
      
      // Update controls
      controls.update()
      
      // Animate mesh
      if (mesh) {
        mesh.rotation.x += 0.01
        mesh.rotation.y += 0.01
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    function onResize() {
      handleResize(container, camera, renderer)
    }
    window.addEventListener('resize', onResize)

    // Cleanup
    cleanupRef.current = () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animationFrameId)
      dispose()
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}