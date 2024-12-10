"use client"

import { useEffect, useRef, useState } from 'react'
import { LumaSplatsThree, LumaSplatsSemantics } from '@lumaai/luma-web'
import * as THREE from 'three'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LumaPreviewProps {
  file: File
  className?: string
}

export function LumaPreview({ file, className }: LumaPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<any>(null)
  const splatRef = useRef<LumaSplatsThree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return
    
    let isDestroyed = false

    // Initialize Three.js scene
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: true
    })
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    )
    
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      if (isDestroyed) return
      
      const controls = new OrbitControls(camera, canvas)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.screenSpacePanning = true
      controlsRef.current = controls
    })

    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    renderer.setPixelRatio(window.devicePixelRatio)
    camera.position.z = 2

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera

    // Create and add Luma splats
    try {
      setIsLoading(true)
      const splat = new LumaSplatsThree({
        source: file,
        semantics: LumaSplatsSemantics.XYZ_RGBA_CONFIDENCE,
        vertexCount: 500000
      })
      
      scene.add(splat)
      splatRef.current = splat
      
      // Center camera on load
      splat.addEventListener('load', () => {
        setIsLoading(false)
        if (isDestroyed) return
        const box = new THREE.Box3().setFromObject(splat)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        camera.position.copy(center)
        camera.position.z += Math.max(...size.toArray()) * 1.5
        camera.lookAt(center)
        
        if (controlsRef.current) {
          controlsRef.current.target.copy(center)
          controlsRef.current.update()
        }
      })
    } catch (err) {
      setError('Failed to load preview. Please try again.')
      console.error('Luma preview error:', err)
    }

    // Animation loop
    function animate() {
      if (isDestroyed) return
      requestAnimationFrame(animate)
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    function handleResize() {
      if (!canvas || !camera || !renderer) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      isDestroyed = true
      window.removeEventListener('resize', handleResize)
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      if (splatRef.current && sceneRef.current) {
        sceneRef.current.remove(splatRef.current)
      }
    }
  }, [file])

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
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
      style={{ touchAction: 'none' }}
    />
  )
}