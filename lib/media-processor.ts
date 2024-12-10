import { LumaSplatsThree, LumaSplatsSemantics } from '@lumaai/luma-web'
import * as THREE from 'three'
import type { ProcessingOptions, ProcessingProgress, MediaType } from './types'
import { ImageProcessor } from './processors/image-processor'
import { VideoProcessor } from './processors/video-processor'
import { ModelProcessor } from './processors/model-processor'
import { BackgroundProcessor } from './processors/background-processor'

export class MediaProcessor {
  private splats: LumaSplatsThree | null = null
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private onProgress?: (progress: ProcessingProgress) => void
  private imageProcessor: ImageProcessor
  private videoProcessor: VideoProcessor
  private modelProcessor: ModelProcessor
  private backgroundProcessor: BackgroundProcessor
  private processingStages: {
    [key in MediaType]: Array<{
      name: string;
      processor: (file: File) => Promise<void>;
    }>;
  }

  constructor(onProgress?: (progress: ProcessingProgress) => void) {
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.onProgress = onProgress
    this.imageProcessor = new ImageProcessor()
    this.videoProcessor = new VideoProcessor()
    this.modelProcessor = new ModelProcessor()
    this.backgroundProcessor = new BackgroundProcessor()
    
    // Define processing stages for each media type
    this.processingStages = {
      image: [
        { name: 'Analyzing image', processor: this.analyzeImage.bind(this) },
        { name: 'Generating point cloud', processor: this.generatePointCloud.bind(this) },
        { name: 'Optimizing geometry', processor: this.optimizeGeometry.bind(this) }
      ],
      video: [
        { name: 'Extracting frames', processor: this.extractFrames.bind(this) },
        { name: 'Analyzing motion', processor: this.analyzeMotion.bind(this) },
        { name: 'Reconstructing 3D scene', processor: this.reconstruct3DScene.bind(this) }
      ],
      model: [
        { name: 'Loading model', processor: this.loadModel.bind(this) },
        { name: 'Processing geometry', processor: this.processGeometry.bind(this) }
      ]
    }
  }

  async processFile(file: File, options: ProcessingOptions) {
    try {
      this.updateProgress('uploading', 0, 'Preparing file...')
      let totalProgress = 0
      
      const mediaType = this.getMediaType(file)
      const stages = this.processingStages[mediaType]
      
      // Process each stage sequentially
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i]
        this.updateProgress(
          'processing',
          totalProgress + (i / stages.length) * 33,
          stage.name
        )
        
        try {
          await stage.processor(file)
          totalProgress += 33
        } catch (err) {
          console.error(`Failed at stage ${stage.name}:`, err)
          throw new Error(`Processing failed at ${stage.name}`)
        }
      }
      
      this.updateProgress('processing', 66, 'Creating 3D model...')
      
      const blobUrl = URL.createObjectURL(file)
      
      this.splats = new LumaSplatsThree({
        source: blobUrl,
        semantics: LumaSplatsSemantics.XYZ_RGBA_CONFIDENCE,
        enableThreeShaderIntegration: true,
        vertexCount: this.getVertexCount(options.quality),
        semanticsMask: options.removeBackground 
          ? LumaSplatsSemantics.FOREGROUND 
          : (LumaSplatsSemantics.FOREGROUND | LumaSplatsSemantics.BACKGROUND),
        onProgress: (progress) => {
          this.updateProgress('processing', progress * 100, 'Processing media...')
        }
      })

      // Wait for processing to complete
      await new Promise<void>((resolve, reject) => {
        this.splats?.addEventListener('load', () => resolve())
        this.splats?.addEventListener('error', (error) => reject(error))
      })

      if (options.optimizeForWeb) {
        await this.optimizeForWeb()
      }

      // Cleanup
      URL.revokeObjectURL(blobUrl)
      
      return {
        success: true,
        vertexCount: this.splats?.getVertexCount() || 0
      }
    } catch (error) {
      console.error('Processing failed:', error)
      throw new Error('Failed to process media')
    }
  }

  private getMediaType(file: File): MediaType {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    return 'model'
  }

  private async analyzeImage(file: File) {
    const imageData = await this.imageProcessor.analyze(file)
    
    if (options.removeBackground) {
      return await this.backgroundProcessor.removeBackground(imageData, options)
    }
    
    return imageData
  }

  private async generatePointCloud(file: File) {
    const imageData = await this.analyzeImage(file)
    const pointCloud = await this.imageProcessor.generatePointCloud(imageData, {
      removeBackground: false,
      quality: 'high',
      optimizeForWeb: true
    })
    return pointCloud
  }

  private async optimizeGeometry(file: File) {
    const pointCloud = await this.generatePointCloud(file)
    const optimized = await this.imageProcessor.optimizeGeometry(pointCloud, {
      removeBackground: false,
      quality: 'high',
      optimizeForWeb: true
    })
    return optimized
  }

  private async extractFrames(file: File) {
    let frames = await this.videoProcessor.extractFrames(file)
    
    if (options.removeBackground) {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(file)
      await new Promise(resolve => video.addEventListener('loadedmetadata', resolve))
      frames = await this.backgroundProcessor.processVideo(video, options)
      URL.revokeObjectURL(video.src)
    }
    
    return frames
  }

  private async analyzeMotion(file: File) {
    const frames = await this.extractFrames(file)
    const motionVectors = await this.videoProcessor.analyzeMotion(frames)
    return { frames, motionVectors }
  }

  private async reconstruct3DScene(file: File) {
    const { frames, motionVectors } = await this.analyzeMotion(file)
    const scene = await this.videoProcessor.reconstruct3DScene(
      frames,
      motionVectors,
      {
        removeBackground: false,
        quality: 'high',
        optimizeForWeb: true
      }
    )
    return scene
  }

  private async loadModel(file: File) {
    const model = await this.modelProcessor.loadModel(file)
    return model
  }

  private async processGeometry(file: File) {
    const model = await this.loadModel(file)
    const processed = await this.modelProcessor.processGeometry(model, {
      removeBackground: false,
      quality: 'high',
      optimizeForWeb: true
    })
    return processed
  }

  private getVertexCount(quality: 'low' | 'medium' | 'high'): number {
    const settings = {
      low: 100000,
      medium: 300000,
      high: 500000
    }
    return settings[quality]
  }

  private async optimizeForWeb() {
    this.updateProgress('optimizing', 0, 'Optimizing for web...')
    
    // Apply optimizations
    if (this.splats) {
      // Reduce texture sizes
      const textures = this.splats.material.uniforms
      for (const key in textures) {
        const texture = textures[key].value
        if (texture instanceof THREE.Texture) {
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.generateMipmaps = false
        }
      }

      // Optimize geometry
      const geometry = this.splats.geometry
      geometry.attributes.position.setUsage(THREE.StaticDrawUsage)
      
      this.updateProgress('optimizing', 100, 'Optimization complete')
    }
  }

  private updateProgress(stage: ProcessingProgress['stage'], progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message })
    }
  }

  dispose() {
    this.splats?.dispose()
    this.renderer.dispose()
    this.imageProcessor.dispose()
    this.backgroundProcessor.dispose()
  }
}