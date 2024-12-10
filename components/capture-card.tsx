"use client"

import { Card } from "@/components/ui/card"
import { Capture } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { Eye, Link2, Lock, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { CaptureDialog } from "./capture-dialog"

interface CaptureCardProps {
  capture: Capture
}

export function CaptureCard({ capture }: CaptureCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
      <Card 
        className="group overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
        onClick={() => setShowDetails(true)}
      >
        <div className="aspect-video bg-muted relative">
          <img
            src={capture.thumbnailUrl}
            alt={capture.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2">
                {capture.privacy === 'private' && <Lock className="h-4 w-4" />}
                {capture.privacy === 'public' && <Globe className="h-4 w-4" />}
                {capture.privacy === 'unlisted' && <Link2 className="h-4 w-4" />}
                <Badge variant="secondary" className="text-xs">
                  {capture.cameraType}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 truncate">{capture.title}</h3>
          <p className="text-sm text-muted-foreground">
            Created {formatDistanceToNow(new Date(capture.createdAt))} ago
          </p>
        </div>
      </Card>

      <CaptureDialog 
        open={showDetails} 
        onOpenChange={setShowDetails}
        captureId={capture.id}
      />
    </>
  )
}