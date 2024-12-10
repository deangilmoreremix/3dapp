"use client"

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { processMedia } from '@/lib/upload-service'
import type { UploadRequest, ProcessingProgress } from '@/lib/types'

export function useUpload() {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)

  const upload = async (data: UploadRequest) => {
    try {
      setIsUploading(true)
      const response = await processMedia(data, (progress) => {
        setProgress(progress)
      })
      
      toast({
        title: "Upload successful",
        description: "Your media has been processed and uploaded successfully."
      })

      return response
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : 
          "There was an error processing your media. Please try again."
      })
      throw error
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }

  return {
    upload,
    isUploading,
    progress
  }
}