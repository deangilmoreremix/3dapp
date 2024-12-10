"use client"

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { LumaSplatsThree, type LumaSplatsSemantics } from '@lumaai/luma-web'
import * as THREE from 'three'

interface LumaSplatsProps {
  source: string
  semanticsMask?: LumaSplatsSemantics
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

export function LumaSplats({ 
  source, 
  semanticsMask,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1
}: LumaSplatsProps) {
  const { scene } = useThree()
  const splatsRef = useRef<LumaSplatsThree | null>(null)

  useEffect(() => {
    const splats = new LumaSplatsThree({
      source,
      semanticsMask,
      enableThreeShaderIntegration: true,
      loadingAnimationEnabled: true,
      particleRevealEnabled: true
    })

    // Set transform
    splats.position.set(...position)
    splats.rotation.set(...rotation)
    if (Array.isArray(scale)) {
      splats.scale.set(...scale)
    } else {
      splats.scale.set(scale, scale, scale)
    }

    scene.add(splats)
    splatsRef.current = splats

    return () => {
      if (splatsRef.current) {
        scene.remove(splatsRef.current)
        splatsRef.current = null
      }
    }
  }, [source, semanticsMask, position, rotation, scale, scene])

  return null
}