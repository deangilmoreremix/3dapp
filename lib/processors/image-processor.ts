import * as THREE from 'three';
import { ProcessingOptions } from '../types';

export class ImageProcessor {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
  }

  async analyze(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async generatePointCloud(imageData: ImageData, options: ProcessingOptions): Promise<THREE.Points> {
    const { width, height, data } = imageData;
    const points: number[] = [];
    const colors: number[] = [];
    const density = options.processingPreferences?.pointCloudDensity || 1;

    for (let y = 0; y < height; y += density) {
      for (let x = 0; x < width; x += density) {
        const i = (y * width + x) * 4;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const a = data[i + 3] / 255;

        if (a > 0.5) {
          points.push(
            (x - width / 2) / 50,
            (height / 2 - y) / 50,
            (r + g + b) / 3
          );
          colors.push(r, g, b);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true
    });

    return new THREE.Points(geometry, material);
  }

  async optimizeGeometry(points: THREE.Points, options: ProcessingOptions): Promise<THREE.Points> {
    const geometry = points.geometry;
    const simplification = options.processingPreferences?.geometrySimplification || 1;

    // Perform geometry optimization
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    // Apply simplification if needed
    if (simplification > 1) {
      const positions = geometry.getAttribute('position').array;
      const colors = geometry.getAttribute('color').array;
      const stride = Math.floor(simplification);
      
      const newPositions = new Float32Array(positions.length / stride);
      const newColors = new Float32Array(colors.length / stride);
      
      for (let i = 0, j = 0; i < positions.length; i += 3 * stride, j += 3) {
        newPositions[j] = positions[i];
        newPositions[j + 1] = positions[i + 1];
        newPositions[j + 2] = positions[i + 2];
        
        newColors[j] = colors[i];
        newColors[j + 1] = colors[i + 1];
        newColors[j + 2] = colors[i + 2];
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    }

    return points;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}