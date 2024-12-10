import { useEffect, useRef, useState } from 'react'
import { LumaSplatsThree, LumaSplatsSemantics } from '@lumaai/luma-web'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'

interface LumaSceneProps {
  file?: File
  className?: string
}

export function LumaScene({ file, className }: LumaSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const splatsRef = useRef<LumaSplatsThree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize Three.js scene
    const container = containerRef.current
    const scene = new THREE.Scene()
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
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    
    // Setup camera and controls
    camera.position.z = 5
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Store refs
    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    controlsRef.current = controls

    // Animation loop
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // Handle file changes
  useEffect(() => {
    if (!file || !sceneRef.current) return
    setError(null)
    setIsLoading(true)
    setLoadProgress(0)

    // Remove existing splats
    if (splatsRef.current) {
      sceneRef.current.remove(splatsRef.current)
      splatsRef.current = null
    }

    try {
      const splats = new LumaSplatsThree({
        source: file,
        semantics: LumaSplatsSemantics.XYZ_RGBA_CONFIDENCE,
        vertexCount: 500000,
        onProgress: (progress) => {
          setLoadProgress(Math.round(progress * 100))
        }
      })

      sceneRef.current.add(splats)
      splatsRef.current = splats

      // Center camera on load
      splats.addEventListener('load', () => {
        if (!cameraRef.current || !controlsRef.current) return
        
        const box = new THREE.Box3().setFromObject(splats)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        cameraRef.current.position.copy(center)
        cameraRef.current.position.z += Math.max(...size.toArray()) * 1.5
        cameraRef.current.lookAt(center)
        
        controlsRef.current.target.copy(center)
        controlsRef.current.update()
        setIsLoading(false)
      })
    } catch (err) {
      console.error('Failed to load Luma splats:', err)
      setError('Failed to load media. Please try again.')
      setIsLoading(false)
    }
  }, [file])

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} className="w-full h-full" />
      
      {error && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading && (
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Progress value={loadProgress} />
          <p className="text-sm text-center text-white">
            Loading... {loadProgress}%
          </p>
        </div>
      )}
    </div>
  )
}