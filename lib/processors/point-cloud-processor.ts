import * as THREE from 'three';
import { ProcessingOptions } from '@/lib/types';

interface ProcessingResult {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  boundingBox: THREE.Box3;
}

export class PointCloudProcessor {
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private octree: THREE.Octree;
  private levels: THREE.Points[] = [];
  private worker: Worker | null = null;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.octree = new THREE.Octree();
  }

  async processPointCloud(
    positions: Float32Array,
    colors: Float32Array,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    // Initialize web worker for heavy processing
    this.initWorker();

    // Set geometry attributes
    this.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );

    // Compute normals for better rendering
    this.geometry.computeVertexNormals();

    // Apply noise reduction if quality is high
    if (options.quality === 'high') {
      await this.applyNoiseReduction(positions, colors);
    }

    // Generate LOD levels based on quality setting
    const lodLevels = this.getLODLevels(options.quality);
    await this.generateLODLevels(lodLevels);

    // Build spatial index
    await this.buildSpatialIndex();

    // Compute bounding information
    const boundingBox = new THREE.Box3().setFromObject(this.points);

    return {
      geometry: this.geometry,
      material: this.material,
      boundingBox
    };
  }

  private async applyNoiseReduction(positions: Float32Array, colors: Float32Array): Promise<void> {
    return new Promise((resolve) => {
      if (this.worker) {
        this.worker.postMessage({
          type: 'noiseReduction',
          positions,
          colors
        });
        this.worker.onmessage = (e) => {
          const { positions: cleanPositions, colors: cleanColors } = e.data;
          this.updateGeometry(cleanPositions, cleanColors);
          resolve();
        };
      } else {
        resolve();
      }
    });
  }

  private async buildSpatialIndex(): Promise<void> {
    // Build octree for LOD and spatial queries
    this.octree.fromGeometry(this.geometry);
    
    // Add additional spatial indexing for faster queries
    const positions = this.geometry.getAttribute('position').array;
    const indices = [];
    
    const lodLevels = options.processingPreferences?.lodLevels || 
    for (let i = 0; i < positions.length; i += 3) {
      indices.push(i / 3);
    }
    
    this.geometry.setIndex(indices);
  }

  private getLODLevels(quality?: 'low' | 'medium' | 'high'): number {
    const levels = {
      low: 2,
      medium: 4,
      high: 6
    };
    return levels[quality || 'medium'];
  }

  private async generateLODLevels(levels: number): Promise<void> {
    this.levels = [];
    let currentGeometry = this.geometry.clone();
    
    for (let i = 0; i < levels; i++) {
      // Add small delay to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const decimationRatio = 1 / Math.pow(2, i + 1);
      const simplifiedGeometry = this.decimateGeometry(
        currentGeometry,
        decimationRatio
      );
      
      const levelPoints = new THREE.Points(
        simplifiedGeometry,
        this.material.clone()
      );
      
      this.levels.push(levelPoints);
      currentGeometry = simplifiedGeometry;
    }
  }

  private decimateGeometry(
    geometry: THREE.BufferGeometry,
    ratio: number
  ): THREE.BufferGeometry {
    const positions = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color');
    const vertexCount = Math.floor(positions.count * ratio);
    
    const decimated = new THREE.BufferGeometry();
    const stride = Math.floor(1 / ratio);
    
    const newPositions = new Float32Array(vertexCount * 3);
    const newColors = new Float32Array(vertexCount * 3);
    
    for (let i = 0, j = 0; i < vertexCount; i++, j += stride * 3) {
      newPositions[i * 3] = positions.array[j];
      newPositions[i * 3 + 1] = positions.array[j + 1];
      newPositions[i * 3 + 2] = positions.array[j + 2];
      
      newColors[i * 3] = colors.array[j];
      newColors[i * 3 + 1] = colors.array[j + 1];
      newColors[i * 3 + 2] = colors.array[j + 2];
    }
    
    decimated.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newPositions, 3)
    );
    decimated.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(newColors, 3)
    );
    
    return decimated;
  }

  private initWorker() {
    if (typeof Worker !== 'undefined' && !this.worker) {
      const workerCode = `
        self.onmessage = function(e) {
          if (e.data.type === 'noiseReduction') {
            // Perform noise reduction
            const { positions, colors } = e.data;
            const result = reduceNoise(positions, colors);
            self.postMessage(result);
          }
        };
      
        function reduceNoise(positions, colors) {
          // Implementation of noise reduction algorithm
          return { positions, colors };
        }
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    }
  }

  updateLOD(camera: THREE.Camera): void {
    const distance = camera.position.distanceTo(this.points.position);
    let activeLOD = 0;
    
    // Select appropriate LOD based on distance
    if (distance > 50) {
      activeLOD = 4;
    } else if (distance > 20) {
      activeLOD = 3;
    } else if (distance > 10) {
      activeLOD = 2;
    } else if (distance > 5) {
      activeLOD = 1;
    }
    
    // Only show active LOD level
    this.levels.forEach((level, index) => {
      level.visible = index === activeLOD;
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.geometry.dispose();
    this.material.dispose();
    this.levels.forEach(level => {
      level.geometry.dispose();
      (level.material as THREE.Material).dispose();
    });
  }
}