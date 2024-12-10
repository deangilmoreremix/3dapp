import { useEffect, useRef, useState } from 'react'
import { LumaSplatsThree, LumaSplatsSemantics } from '@lumaai/luma-web'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LumaViewerProps {
  file: File
  removeBackground?: boolean
  className?: string
  onLoad?: () => void
  onError?: (error: string) => void
}

export function LumaViewer({ 
  file, 
  removeBackground = false, 
  className,
  onLoad,
  onError 
}: LumaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const splatsRef = useRef<LumaSplatsThree | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    if (!containerRef.current || !file) return

    const container = containerRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    camera.position.z = 5
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    try {
      const blobUrl = URL.createObjectURL(file)

      const splats = new LumaSplatsThree({
        source: blobUrl,
        enableThreeShaderIntegration: true,
        loadingAnimationEnabled: false,
        particleRevealEnabled: true,
        semantics: LumaSplatsSemantics.XYZ_RGBA_CONFIDENCE,
        vertexCount: 500000,
        semanticsMask: removeBackground 
          ? LumaSplatsSemantics.FOREGROUND 
          : (LumaSplatsSemantics.FOREGROUND | LumaSplatsSemantics.BACKGROUND),
        onProgress: (value) => {
          setProgress(Math.round(value * 100))
        }
      })
      
      splatsRef.current = splats
      scene.add(splats)

      // Center camera on load
      splats.addEventListener('load', () => {
        setIsLoading(false)
        if (onLoad) onLoad()
        
        const box = new THREE.Box3().setFromObject(splats)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        camera.position.copy(center)
        camera.position.z += Math.max(...size.toArray()) * 1.5
        camera.lookAt(center)
        
        controls.target.copy(center)
        controls.update()
      })

      // Animation loop
      function animate() {
        requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // Handle window resize
      function handleResize() {
        const width = container.clientWidth
        const height = container.clientHeight
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        URL.revokeObjectURL(blobUrl)
        renderer.dispose()
        if (splatsRef.current) {
          scene.remove(splatsRef.current)
          splatsRef.current = null
        }
        container.removeChild(renderer.domElement)
      }
    } catch (err) {
      console.error('Failed to initialize Luma scene:', err)
      setError('Failed to process media')
      if (onError) onError('Failed to process media')
    }
  }, [file, removeBackground])

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
      
      {(isLoading || progress < 100) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <Progress value={progress} className="w-48" />
            <p className="text-sm text-white">Processing... {progress}%</p>
          </div>
        </div>
      )}
    </div>
  )
}