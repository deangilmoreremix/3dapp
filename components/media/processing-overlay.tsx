import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import type { ProcessingProgress } from '@/lib/types'

interface ProcessingOverlayProps {
  progress: ProcessingProgress
}

export function ProcessingOverlay({ progress }: ProcessingOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <Progress value={progress.progress} className="w-64" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-white">
            {progress.message}
          </p>
          <p className="text-xs text-white/60">
            {progress.progress.toFixed(0)}%
            <span className="ml-1 text-white/40">
              {progress.stage === 'processing' ? '• Processing' : 
               progress.stage === 'optimizing' ? '• Optimizing' : 
               '• Uploading'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}