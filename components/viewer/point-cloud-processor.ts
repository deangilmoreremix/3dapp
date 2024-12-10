import * as THREE from 'three'
import { ProcessingOptions } from '@/lib/types'

export class PointCloudProcessor {
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private octree: THREE.Octree
  private levels: THREE.Points[] = []

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true,
      sizeAttenuation: true
    })
    this.points = new THREE.Points(this.geometry, this.material)
    this.octree = new THREE.Octree()
  }

  async processPointCloud(
    positions: Float32Array,
    colors: Float32Array,
    options: ProcessingOptions
  ): Promise<THREE.Points> {
    // Set geometry attributes
    this.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    this.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    )

    // Build octree for LOD
    this.octree.fromGeometry(this.geometry)
    
    // Generate LOD levels
    const lodLevels = options.quality === 'high' ? 5 : 
                     options.quality === 'medium' ? 3 : 1
    
    await this.generateLODLevels(lodLevels)

    return this.points
  }

  private async generateLODLevels(levels: number): Promise<void> {
    this.levels = []
    
    for (let i = 0; i < levels; i++) {
      // Add small delay to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const reduction = Math.pow(2, i)
      const positions = this.geometry.getAttribute('position').array
      const colors = this.geometry.getAttribute('color').array
      
      const newPositions = new Float32Array(positions.length / reduction)
      const newColors = new Float32Array(colors.length / reduction)
      
      for (let j = 0; j < positions.length; j += 3 * reduction) {
        const index = j / reduction
        newPositions[index] = positions[j]
        newPositions[index + 1] = positions[j + 1]
        newPositions[index + 2] = positions[j + 2]
        
        newColors[index] = colors[j]
        newColors[index + 1] = colors[j + 1]
        newColors[index + 2] = colors[j + 2]
      }
      
      const levelGeometry = new THREE.BufferGeometry()
      levelGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(newPositions, 3)
      )
      levelGeometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(newColors, 3)
      )
      
      const levelPoints = new THREE.Points(levelGeometry, this.material.clone())
      this.levels.push(levelPoints)
    }
  }

  updateLOD(camera: THREE.Camera) {
    const distance = camera.position.distanceTo(this.points.position)
    let activeLOD = 0
    
    // Select appropriate LOD based on distance
    if (distance > 50) {
      activeLOD = 4
    } else if (distance > 20) {
      activeLOD = 3
    } else if (distance > 10) {
      activeLOD = 2
    } else if (distance > 5) {
      activeLOD = 1
    }
    
    // Only show active LOD level
    this.levels.forEach((level, index) => {
      level.visible = index === activeLOD
    })
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.levels.forEach(level => {
      level.geometry.dispose()
      ;(level.material as THREE.Material).dispose()
    })
  }
}