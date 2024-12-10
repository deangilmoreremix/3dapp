import { useCallback, useState } from 'react'
import { AlertCircle, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
const SUPPORTED_TYPES = {
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'video/mp4': true,
  'video/quicktime': true,
}

export function FileUpload({ onFileSelect, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const validateFile = (file: File) => {
    setError(null)
    
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 5GB limit')
      return false
    }
    
    if (!SUPPORTED_TYPES[file.type] && !file.name.endsWith('.zip')) {
      setError('Unsupported file type. Please upload an image, video, or ZIP file')
      return false
    }
    
    return true
  }

  const simulateUpload = async (file: File) => {
    setIsUploading(true)
    setProgress(0)
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setProgress(i)
    }
    
    setIsUploading(false)
    onFileSelect(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && validateFile(file)) {
      simulateUpload(file)
    }
  }, [onFileSelect, validateFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      simulateUpload(file)
    }
  }, [onFileSelect, validateFile])

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 space-y-4',
        isDragging ? 'border-primary bg-primary/10' : 'border-muted',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*,video/*,.zip"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center text-center">
        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Drop media here or click to upload</h3>
        <p className="text-sm text-muted-foreground">
          Supports images, videos, and ZIP files up to 5GB
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-center text-muted-foreground">
            Uploading... {progress}%
          </p>
        </div>
      )}
    </div>
  )
}