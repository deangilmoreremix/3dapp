"use client"

import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { MediaDialog } from '@/components/media-dialog'

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setShowDialog(true)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Media Upload</h1>
          <p className="text-muted-foreground">
            Upload and process your media files
          </p>
        </div>

        <FileUpload 
          onFileSelect={handleFileSelect}
          className="max-w-xl mx-auto"
        />

        <MediaDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          file={selectedFile}
          onUpload={() => {
            setShowDialog(false)
            setSelectedFile(null)
          }}
        />
      </div>
    </main>
  )
}