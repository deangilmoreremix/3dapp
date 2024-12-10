"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface HelpSection {
  title: string
  content: React.ReactNode
}

const helpSections: HelpSection[] = [
  {
    title: "Instructions for video file",
    content: (
      <ul className="space-y-2 text-sm">
        <li>• Disable HDR when capturing videos</li>
        <li>• Capture a scene or object by going around in loops</li>
        <li>• Ideally, capture in loops from 3 heights:
          <ul className="ml-4 mt-1 space-y-1">
            <li>- phone at chest level looking ahead</li>
            <li>- phone a bit above the head pointing a bit down to the center of the scene</li>
            <li>- and finally from knee level pointing upwards a bit</li>
          </ul>
        </li>
        <li>• Capture slowly to reduce blur</li>
        <li>• You can either upload a normal/fisheye/equirectangular video or a zip of videos</li>
        <li>• Maximum the size of the video can be 5 gigabytes</li>
      </ul>
    )
  },
  {
    title: "Instructions for images zip",
    content: (
      <ul className="space-y-2 text-sm">
        <li>• Supported image formats:
          <ul className="ml-4 mt-1 space-y-1">
            <li>- normal - jpg, jpeg, png, gif, pgm, ppm, tga</li>
            <li>- HDR - .exr</li>
            <li>- RAW - .cr3, .dng</li>
          </ul>
        </li>
        <li>• Make sure the zip contains same kind of image formats</li>
        <li>• You can upload a zip of normal/fisheye/equirectangular images</li>
        <li>• Downsample the images if you hit 5 gigabytes limit using tools available</li>
        <li>• Maximum the size of the images zip file can be 5 gigabytes</li>
      </ul>
    )
  }
]

export function HelpDialog() {
  const [open, setOpen] = React.useState(false)
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-4 w-4" />
        Help
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Help</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {helpSections.map((section) => (
            <div key={section.title} className="border rounded-lg">
              <button
                className={cn(
                  "flex w-full items-center justify-between p-4",
                  "text-left text-sm font-medium",
                  "hover:bg-muted/50 transition-colors"
                )}
                onClick={() => setExpandedSection(
                  expandedSection === section.title ? null : section.title
                )}
              >
                {section.title}
                {expandedSection === section.title ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedSection === section.title && (
                <div className="p-4 pt-0 text-muted-foreground">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}