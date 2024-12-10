"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { CaptureDetails } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Link2, Lock, Globe, Share2, Download, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThreeViewer } from "./three-viewer"

interface CaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  captureId: string
}

export function CaptureDialog({ open, onOpenChange, captureId }: CaptureDialogProps) {
  const [capture, setCapture] = useState<CaptureDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchCapture = async () => {
      try {
        // Simulated API response
        const response: CaptureDetails = {
          id: captureId,
          title: "Sample Capture",
          description: "This is a sample capture description",
          createdAt: new Date().toISOString(),
          thumbnailUrl: `https://source.unsplash.com/random/800x600?3d`,
          status: "ready",
          privacy: "private",
          cameraType: "normal",
          fileType: "zip",
          fileSize: 1024 * 1024 * 50, // 50MB
          views: 123,
          shares: 45,
          linkSharing: true
        }
        setCapture(response)
      } catch (err) {
        setError("Failed to load capture details")
      }
    }

    if (open && captureId) {
      fetchCapture()
    }
  }, [open, captureId])

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    )
  }

  if (!capture) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <div className="flex h-full gap-6">
          {/* Preview Section */}
          <div className="flex-1 min-w-0">
            <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
              <ThreeViewer className="w-full h-full" />
            </div>
          </div>

          {/* Details Section */}
          <div className="w-[300px] flex flex-col">
            <div className="flex-1">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{capture.title}</h2>
                {capture.description && (
                  <p className="text-muted-foreground">{capture.description}</p>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  {capture.privacy === 'private' && <Lock className="h-4 w-4" />}
                  {capture.privacy === 'public' && <Globe className="h-4 w-4" />}
                  {capture.privacy === 'unlisted' && <Link2 className="h-4 w-4" />}
                  <span className="text-sm">{capture.privacy}</span>
                </div>

                <div className="space-y-2">
                  <Badge variant="secondary">{capture.cameraType}</Badge>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {capture.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-4 w-4" />
                      {capture.shares}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(new Date(capture.createdAt))} ago
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-6 border-t">
              <Button className="w-full" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}