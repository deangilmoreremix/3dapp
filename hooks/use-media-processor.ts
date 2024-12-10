import { useState, useCallback } from 'react'
import { MediaProcessor } from '@/lib/media-processor'
import type { ProcessingOptions, ProcessingProgress } from '@/lib/types'

export function useMediaProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  
  const processMedia = useCallback(async (file: File, options: ProcessingOptions) => {
    setIsProcessing(true)
    setProgress(null)
    
    const processor = new MediaProcessor((progress) => {
      setProgress(progress)
    })
    
    try {
      const result = await processor.processFile(file, options)
      return result
    } finally {
      setIsProcessing(false)
      setProgress(null)
      processor.dispose()
    }
  }, [])

  return {
    processMedia,
    isProcessing,
    progress
  }
}