"use client"

import { useEffect, useRef, useState } from 'react'
import { LumaSplatsThree, LumaSplatsSemantics } from '@lumaai/luma-web'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { loadLumaCoreBinary, BINARY_URL } from '@/lib/luma-loader'

interface LumaViewerProps {
  file: File
  options?: {
    quality?: 'low' | 'medium' | 'high'
    removeBackground?: boolean
    optimizeForWeb?: boolean
  }
  className?: string
  onLoad?: () => void
  onError?: (error: string) => void
}

export function LumaViewer({
  file,
  options = {},
  onLoad,
  onError,
  className
}: LumaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const splatsRef = useRef<LumaSplatsThree | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => { 
    if (!containerRef.current || !file) return

    setIsLoading(true)
    setError(null)
    
    const container = containerRef.current
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0x000000)

    const initViewer = async () => {
      try {
        // Pre-load Luma core binary
        const wasmBinary = await loadLumaCoreBinary()
        if (!wasmBinary) {
          throw new Error('Failed to load Luma core binary')
        }

        const camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        )
        camera.position.z = 5

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true
        })
        renderer.setSize(container.clientWidth, container.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controlsRef.current = controls

        const blobUrl = URL.createObjectURL(file)
        
        const splats = new LumaSplatsThree({
          source: blobUrl,
          vertexCount: getVertexCount(options.quality),
          wasmBinary,
          enableThreeShaderIntegration: true,
          loadingAnimationEnabled: true,
          particleRevealEnabled: true,
          semantics: LumaSplatsSemantics.XYZ_RGBA_CONFIDENCE,
          semanticsMask: options.removeBackground 
            ? LumaSplatsSemantics.FOREGROUND 
            : (LumaSplatsSemantics.FOREGROUND | LumaSplatsSemantics.BACKGROUND),
          onProgress: (value) => {
            setProgress(Math.round(value * 100))
          }
        })

        splatsRef.current = splats
        scene.add(splats)

        // Wait for splats to load
        await new Promise<void>((resolve, reject) => {
          splats.addEventListener('load', () => resolve())
          splats.addEventListener('error', (error) => {
            console.error('Splats load error:', error)
            reject(new Error('Failed to load media'))
          })
        })

        // Process point cloud if needed
        if (options.removeBackground || options.optimizeForWeb) {
          setIsProcessing(true)
          try {
            const processed = await processPointCloud(splats, options)
            if (processed) {
              scene.remove(splats)
              scene.add(processed)
            }
            if (onLoad) onLoad()
          } finally {
            setIsProcessing(false)
          }
        }

        // Center camera on load
        splats.addEventListener('load', () => {
          setIsLoading(false)
          const box = new THREE.Box3().setFromObject(splats)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          
          camera.position.copy(center)
          camera.position.z += Math.max(...size.toArray()) * 1.5
          camera.lookAt(center)
          
          controls.target.copy(center)
          controls.update()
        })

        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        function handleResize() {
          const width = container.clientWidth
          const height = container.clientHeight
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
        }
        window.addEventListener('resize', handleResize)

        return () => handleResize
      } catch (err) {
        console.error('Failed to initialize viewer:', err)
        setError('Failed to initialize viewer')
        if (onError) onError('Failed to initialize viewer')
      }
    }

    initViewer().catch(console.error)

    return () => {
      // Cleanup animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Cleanup Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose()
        container.removeChild(rendererRef.current.domElement)
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

      if (splatsRef.current && sceneRef.current) {
        splatsRef.current.dispose()
        sceneRef.current.remove(splatsRef.current)
      }
    }

  }, [file, options, onLoad, onError])

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="w-full h-full" />
      
      {(isLoading || isProcessing) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
          <Progress value={progress} className="w-48" />
          <p className="text-sm text-white mt-2">
            {isProcessing ? 'Processing...' : 'Loading...'} {progress}%
          </p>
        </div>
      )}
    </div>
  )
}

function processPointCloud(splats: LumaSplatsThree, options?: {
  removeBackground?: boolean
  optimizeForWeb?: boolean
}): Promise<THREE.Object3D | null> {
  // Placeholder implementation
  return Promise.resolve(null)
}

function getVertexCount(quality?: 'low' | 'medium' | 'high'): number {
  const settings = {
    low: 100000,
    medium: 300000,
    high: 500000
  }
  return settings[quality || 'medium']
}