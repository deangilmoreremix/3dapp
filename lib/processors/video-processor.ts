import * as THREE from 'three';
import { ProcessingOptions } from '../types';

export class VideoProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frames: ImageData[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  async extractFrames(file: File): Promise<ImageData[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      
      const frames: ImageData[] = [];
      const frameRate = 5; // Extract 5 frames per second
      
      video.onloadedmetadata = () => {
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        const duration = video.duration;
        let currentTime = 0;
        
        video.onseeked = () => {
          this.ctx.drawImage(video, 0, 0);
          frames.push(
            this.ctx.getImageData(0, 0, video.videoWidth, video.videoHeight)
          );
          
          currentTime += 1 / frameRate;
          if (currentTime < duration) {
            video.currentTime = currentTime;
          } else {
            video.onseeked = null;
            URL.revokeObjectURL(video.src);
            resolve(frames);
          }
        };
        
        video.currentTime = currentTime;
      };
      
      video.onerror = () => reject(new Error('Failed to load video'));
    });
  }

  async analyzeMotion(frames: ImageData[]): Promise<THREE.Vector3[]> {
    const motionVectors: THREE.Vector3[] = [];
    
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1];
      const curr = frames[i];
      const motion = this.calculateOpticalFlow(prev, curr);
      motionVectors.push(motion);
    }
    
    return motionVectors;
  }

  private calculateOpticalFlow(frame1: ImageData, frame2: ImageData): THREE.Vector3 {
    // Simplified optical flow calculation
    const width = frame1.width;
    const height = frame1.height;
    let dx = 0, dy = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const diff = Math.abs(frame2.data[i] - frame1.data[i]);
        if (diff > 30) {
          dx += x - width / 2;
          dy += y - height / 2;
        }
      }
    }
    
    return new THREE.Vector3(dx, dy, 0).normalize();
  }

  async reconstruct3DScene(
    frames: ImageData[],
    motionVectors: THREE.Vector3[],
    options: ProcessingOptions
  ): Promise<THREE.Points> {
    const points: number[] = [];
    const colors: number[] = [];
    const density = options.processingPreferences?.pointCloudDensity || 1;

    // Use motion vectors to estimate depth and create point cloud
    frames.forEach((frame, index) => {
      const motion = motionVectors[index] || new THREE.Vector3();
      const depth = motion.length() * 10;

      for (let y = 0; y < frame.height; y += density) {
        for (let x = 0; x < frame.width; x += density) {
          const i = (y * frame.width + x) * 4;
          const r = frame.data[i] / 255;
          const g = frame.data[i + 1] / 255;
          const b = frame.data[i + 2] / 255;
          const a = frame.data[i + 3] / 255;

          if (a > 0.5) {
            points.push(
              (x - frame.width / 2) / 50,
              (frame.height / 2 - y) / 50,
              depth * ((r + g + b) / 3)
            );
            colors.push(r, g, b);
          }
        }
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true
    });

    return new THREE.Points(geometry, material);
  }
}