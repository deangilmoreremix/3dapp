"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Info, X, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { LumaViewer } from "./viewer/LumaViewer"
import { ProcessingOverlay } from "./media/processing-overlay"
import { useUpload } from "@/hooks/use-upload"

interface MediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file?: File | null
  onUpload?: () => void
}

export function MediaDialog({ open, onOpenChange, file, onUpload }: MediaDialogProps) {
  const [title, setTitle] = useState("")
  const [cameraType, setCameraType] = useState("normal")
  const [privacy, setPrivacy] = useState("private")
  const [linkSharing, setLinkSharing] = useState(false)
  const [removeHumans, setRemoveHumans] = useState(false)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [optimizeForWeb, setOptimizeForWeb] = useState(true)
  const { upload, isUploading, progress } = useUpload()

  const handleUpload = async () => {
    if (!file) return
    
    try {
      await upload({
        file,
        title: title.trim() || 'Untitled',
        cameraType: cameraType as 'normal' | 'fisheye' | 'equirectangular',
        privacy: privacy as 'private' | 'public' | 'unlisted',
        linkSharing,
        removeBackground: removeHumans,
        processingOptions: {
          quality,
          optimizeForWeb,
          removeBackground: removeHumans
        }
      })

      if (onUpload) onUpload()
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] p-0 gap-0 bg-black/98 border-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-3.5 border-b border-neutral-800">
          <DialogTitle className="text-base font-semibold text-white">Create New Capture</DialogTitle>
          <button
            className="text-neutral-400 hover:text-white/90 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="flex gap-8 p-6">
          {/* Media Preview */}
          <div className="flex-1 min-w-0">
            <div className="w-full aspect-[16/9] bg-neutral-900 rounded-lg overflow-hidden">
              {file && <LumaViewer file={file} className="w-full h-full" />}
            </div>
          </div>

          {/* Settings */}
          <div className="w-[300px] space-y-5">
            <div>
              <div className="text-sm text-neutral-400 mb-2">Title</div>
              <Input
                type="text"
                placeholder="Add a title for your capture"
                className="bg-neutral-900 border-neutral-800 text-sm h-9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm text-neutral-400">Camera type</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-transparent p-0">
                    <Info className="h-3 w-3" />
                  </Button>
                </div>
                <Select value={cameraType} onValueChange={setCameraType}>
                  <SelectTrigger className="bg-neutral-900 border-neutral-800 h-9 text-sm">
                    <SelectValue placeholder="Select camera type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fisheye">Fisheye</SelectItem>
                    <SelectItem value="equirectangular">Equirectangular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm text-neutral-400">Privacy</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-transparent p-0">
                    <Info className="h-3 w-3" />
                  </Button>
                </div>
                <Select value={privacy} onValueChange={setPrivacy}>
                  <SelectTrigger className="bg-neutral-900 border-neutral-800 h-9 text-sm">
                    <SelectValue placeholder="Select privacy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Link sharing</span>
              <Switch
                checked={linkSharing}
                onCheckedChange={setLinkSharing}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remove-humans"
                checked={removeHumans}
                onCheckedChange={(checked) => setRemoveHumans(checked as boolean)}
                className="border-neutral-800 data-[state=checked]:bg-blue-600"
              />
              <span className="text-sm text-neutral-400">Remove humans</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-neutral-800">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-sm h-9"
          >
            Close
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!file}
            className="bg-blue-600 text-white hover:bg-blue-700 text-sm h-9"
          >
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}