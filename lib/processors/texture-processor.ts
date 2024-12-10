import * as THREE from 'three';
import { ProcessingOptions } from '../types';

export class TextureProcessor {
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
  }

  async enhanceTexture(texture: THREE.Texture, options: ProcessingOptions): Promise<THREE.Texture> {
    const { width, height } = texture.image;
    const targetSize = this.getTargetSize(width, height, options.quality);
    
    // Create render target for processing
    const renderTarget = new THREE.WebGLRenderTarget(targetSize.width, targetSize.height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });

    // Setup processing scene
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        exposure: { value: 1.0 },
        contrast: { value: 1.1 },
        saturation: { value: 1.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float exposure;
        uniform float contrast;
        uniform float saturation;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Apply exposure
          color.rgb *= exposure;
          
          // Apply contrast
          color.rgb = (color.rgb - 0.5) * contrast + 0.5;
          
          // Apply saturation
          float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(luminance), color.rgb, saturation);
          
          gl_FragColor = color;
        }
      `
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Render enhanced texture
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);

    // Create new texture from render target
    const enhancedTexture = new THREE.Texture(
      this.generateTextureImage(renderTarget)
    );
    enhancedTexture.needsUpdate = true;

    // Cleanup
    renderTarget.dispose();
    material.dispose();
    quad.geometry.dispose();

    return enhancedTexture;
  }

  private getTargetSize(width: number, height: number, quality: string): { width: number; height: number } {
    const scale = quality === 'high' ? 2 : 
                 quality === 'medium' ? 1 : 0.5;
                 
    return {
      width: Math.floor(width * scale),
      height: Math.floor(height * scale)
    };
  }

  private generateTextureImage(renderTarget: THREE.WebGLRenderTarget): HTMLImageElement {
    const buffer = new Uint8Array(
      renderTarget.width * renderTarget.height * 4
    );
    this.renderer.readRenderTargetPixels(
      renderTarget,
      0, 0,
      renderTarget.width,
      renderTarget.height,
      buffer
    );

    const canvas = document.createElement('canvas');
    canvas.width = renderTarget.width;
    canvas.height = renderTarget.height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    imageData.data.set(buffer);
    ctx.putImageData(imageData, 0, 0);

    const image = new Image();
    image.src = canvas.toDataURL();
    return image;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}