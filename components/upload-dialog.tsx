"use client"

import * as React from "react"
import { AlertCircle, Upload, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HelpDialog } from "./help-dialog"
import { cn } from "@/lib/utils"
import { CapturePreview } from "./preview/capture-preview"
import { PreviewDialog } from "./preview-dialog"

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload?: () => void
}

export function UploadDialog({ open, onOpenChange, onUpload }: UploadDialogProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showPreview, setShowPreview] = React.useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const validateFileSize = (file: File) => {
    const maxSize = 5 * 1024 * 1024 * 1024 // 5GB in bytes
    if (file.size > maxSize) {
      setError(`File exceeds the 5GB size limit`)
      return false
    }
    return true
  }

  const isValidImageType = (fileName: string): boolean => {
    const validExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', 
      '.pgm', '.ppm', '.tga', '.exr',
      '.cr3', '.dng', '.zip'
    ]
    return validExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
  }

  const handleFiles = (newFiles: File[]) => {
    setError(null)
    
    if (newFiles.length > 0) {
      const file = newFiles[0]
      if (!validateFileSize(file)) return
      
      if (
        file.type === 'application/zip' || 
        file.name.endsWith('.zip') ||
        isValidImageType(file.name) || 
        file.type.startsWith('video/')
      ) {
        setSelectedFile(file)
        setShowPreview(true)
        return
      }
    }

    setError('Please upload valid image, video, or ZIP files')
  }

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Upload Capture</DialogTitle>
              <HelpDialog />
            </div>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div
            key={isDragging ? 'dragging' : 'not-dragging'}
            className="mt-4 border-2 border-dashed rounded-lg p-8 text-center border-neutral-800"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-neutral-500" />
            <h3 className="mt-4 text-lg font-semibold">Drop files here or click to upload</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Support for images, videos, and ZIP files up to 5GB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,video/*,.zip,application/zip"
            />
            <Button
              variant="secondary"
              className="mt-4 bg-neutral-900 hover:bg-neutral-800 border-neutral-800"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Files
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <PreviewDialog
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open)
          if (!open) {
            setSelectedFile(null)
            onOpenChange(false)
          }
        }}
        file={selectedFile}
        onUpload={() => {
          setShowPreview(false)
          onOpenChange(false)
          if (onUpload) onUpload()
        }}
      />
    </>
  )
}