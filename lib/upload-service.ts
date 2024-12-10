import { LumaSplatsThree, LumaSplatsSemantics } from "@lumaai/luma-web"
import type { UploadRequest, ProcessingProgress, MediaType } from "@/lib/types"
import * as THREE from 'three'

export async function processMedia(
  data: UploadRequest,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ id: string; status: string; url: string }> {
  try {
    // Determine media type
    const mediaType = getMediaType(data.file)
    
    // Report upload progress
    if (onProgress) {
      onProgress({
        stage: 'uploading',
        progress: 0,
        message: 'Preparing upload...'
      })
    }

    // Create a blob URL for the file
    const blobUrl = URL.createObjectURL(data.file)
    
    // Initialize Luma scene to process the file
    const splats = new LumaSplatsThree({
      source: blobUrl,
      semantics: LumaSplatsSemantics.XYZ_RGBA_CONFIDENCE,
      enableThreeShaderIntegration: true,
      loadingAnimationEnabled: false,
      vertexCount: 500000,
      particleRevealEnabled: true,
      semanticsMask: data.removeBackground 
        ? LumaSplatsSemantics.FOREGROUND 
        : (LumaSplatsSemantics.FOREGROUND | LumaSplatsSemantics.BACKGROUND),
      onProgress: (progress) => {
        if (onProgress) {
          onProgress({
            stage: 'processing',
            progress: progress * 100,
            message: 'Processing media...'
          })
        }
      }
    })
    
    // Wait for the scene to load and process
    await new Promise((resolve, reject) => {
      splats.addEventListener('load', resolve)
      splats.addEventListener('error', reject)
    })

    // Optimize output based on options
    if (data.processingOptions?.optimizeForWeb) {
      if (onProgress) {
        onProgress({
          stage: 'optimizing',
          progress: 0,
          message: 'Optimizing for web...'
        })
      }
      await optimizeForWeb(splats, data.processingOptions.quality)
    }

    // Cleanup
    URL.revokeObjectURL(blobUrl)
    
    const id = crypto.randomUUID()

    return {
      id,
      status: 'success',
      url: `https://example.com/captures/${id}`,
      thumbnailUrl: `https://example.com/captures/${id}/thumbnail.jpg`,
      processingDetails: {
        fileSize: data.file.size,
        format: mediaType,
        dimensions: await getMediaDimensions(data.file)
      }
    }
  } catch (error) {
    console.error('Processing failed:', error)
    throw new Error('Failed to process media')
  }
}

function getMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.name.endsWith('.glb') || file.name.endsWith('.gltf') || file.name.endsWith('.zip')) {
    return 'model'
  }
  throw new Error('Unsupported file type')
}

async function getMediaDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.src = URL.createObjectURL(file)
    } else {
      resolve({ width: 1920, height: 1080 }) // Default for non-images
    }
  })
}

async function optimizeForWeb(splats: LumaSplatsThree, quality: 'low' | 'medium' | 'high') {
  const qualitySettings = {
    low: { vertexCount: 100000 },
    medium: { vertexCount: 300000 },
    high: { vertexCount: 500000 }
  }
  
  // Apply quality settings
  const settings = qualitySettings[quality]
  splats.setVertexCount(settings.vertexCount)
}