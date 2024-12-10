export type MediaType = 'image' | 'video' | 'model'

export interface ProcessingOptions {
  removeBackground: boolean
  quality: 'low' | 'medium' | 'high'
  optimizeForWeb: boolean,
  collection?: string,
  tags?: string[],
  cameraOptions?: {
    autoRotate?: boolean
    enableDamping?: boolean
    enableZoom?: boolean
    enablePan?: boolean
    minDistance?: number
    maxDistance?: number
    minPolarAngle?: number
    maxPolarAngle?: number
  },
  processingPreferences?: {
    pointCloudDensity?: number
    textureQuality?: number
    geometrySimplification?: number
    backgroundRemovalThreshold?: number,
    lodLevels?: number
  }
}

export interface ProcessingProgress {
  stage: 'uploading' | 'processing' | 'optimizing'
  progress: number
  message: string
  details?: {
    currentStage?: string
    totalStages?: number
    estimatedTimeRemaining?: number
  }
}

export interface UploadRequest {
  file: File
  title: string
  cameraType: 'normal' | 'fisheye' | 'equirectangular'
  privacy: 'private' | 'public' | 'unlisted'
  collection?: string
  tags?: string[]
  description?: string
  version?: string
  linkSharing: boolean
  removeBackground: boolean
  processingOptions?: ProcessingOptions
}

export interface UploadResponse {
  id: string
  status: string
  url: string
  collection?: string
  tags?: string[]
  description?: string
  version?: string
  createdAt: string
  updatedAt: string
  owner: string
  collaborators?: string[]
  viewCount: number
  downloadCount: number
  thumbnailUrl: string
  processingDetails?: {
    duration?: number
    dimensions?: { width: number; height: number }
    fileSize: number
    format: string
    quality: string
    optimizedForWeb: boolean
    hasBackground: boolean
  }
}

export interface Collection {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  owner: string
  collaborators?: string[]
  captures: string[]
  isPublic: boolean
}

export interface CaptureVersion {
  id: string
  captureId: string
  version: string
  createdAt: string
  changes: string[]
  processingOptions: ProcessingOptions
  url: string
  thumbnailUrl: string
}