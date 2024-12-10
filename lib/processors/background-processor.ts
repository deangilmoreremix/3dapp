import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { ProcessingOptions } from '../types';

export class BackgroundProcessor {
  private model: SelfieSegmentation | null = null;
  private threshold: number = 0.5;

  private async loadModel() {
    if (!this.model) {
      this.model = new SelfieSegmentation({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        }
      });
      
      await this.model.initialize();
    }
    return this.model;
  }

  async removeBackground(imageData: ImageData, options: ProcessingOptions): Promise<ImageData> {
    const model = await this.loadModel();
    const tensor = tf.browser.fromPixels(imageData);
    const segmentation = await model.segmentPeople(tensor);
    const mask = await segmentation[0].mask.toImageData();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const threshold = options.processingPreferences?.backgroundRemovalThreshold || this.threshold;
    
    for (let i = 0; i < processedData.data.length; i += 4) {
      const maskAlpha = mask.data[i + 3] / 255;
      if (maskAlpha < threshold) {
        processedData.data[i + 3] = 0;
      }
    }

    tf.dispose([tensor, ...segmentation]);
    return processedData;
  }

  async processVideo(
    video: HTMLVideoElement, 
    options: ProcessingOptions,
    onProgress?: (progress: number) => void
  ): Promise<ImageData[]> {
    const model = await this.loadModel();
    const frames: ImageData[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const frameRate = 30;
    const totalFrames = Math.floor(video.duration * frameRate);

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i / frameRate;
      await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
      
      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processedFrame = await this.removeBackground(frame, options);
      frames.push(processedFrame);
      
      if (onProgress) {
        onProgress((i + 1) / totalFrames * 100);
      }
    }

    return frames;
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}