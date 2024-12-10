import * as THREE from 'three';
import { ProcessingOptions } from '../types';

export class HDRProcessor {
  private renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
  }

  async processHDR(
    images: ImageData[],
    exposures: number[],
    options: ProcessingOptions
  ): Promise<THREE.Texture> {
    // Merge exposures into HDR
    const hdrData = await this.mergeExposures(images, exposures);
    
    // Create HDR texture
    const hdrTexture = new THREE.DataTexture(
      hdrData,
      images[0].width,
      images[0].height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    
    // Apply tone mapping
    const toneMapping = this.getToneMapping(options);
    const toneMappedTexture = this.applyToneMapping(hdrTexture, toneMapping);
    
    // Generate environment map if needed
    if (options.processingPreferences?.generateEnvMap) {
      return this.generateEnvironmentMap(toneMappedTexture);
    }
    
    return toneMappedTexture;
  }

  private async mergeExposures(
    images: ImageData[],
    exposures: number[]
  ): Promise<Float32Array> {
    const width = images[0].width;
    const height = images[0].height;
    const numExposures = images.length;
    const hdrData = new Float32Array(width * height * 4);

    // Weight function for exposure fusion
    const weight = (value: number) => {
      const t = 0.5;
      return Math.exp(-((value - t) * (value - t)) / (2 * t * t));
    };

    // Merge exposures
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        let sumWeights = 0;
        const rgb = [0, 0, 0];

        for (let e = 0; e < numExposures; e++) {
          const exposure = exposures[e];
          const data = images[e].data;
          
          // Calculate weights for each channel
          const w = weight(data[i] / 255) * 
                   weight(data[i + 1] / 255) * 
                   weight(data[i + 2] / 255);
          
          // Accumulate weighted values
          for (let c = 0; c < 3; c++) {
            const value = data[i + c] / 255;
            rgb[c] += w * value * Math.exp(exposure);
          }
          
          sumWeights += w;
        }

        // Normalize and store result
        if (sumWeights > 0) {
          hdrData[i] = rgb[0] / sumWeights;
          hdrData[i + 1] = rgb[1] / sumWeights;
          hdrData[i + 2] = rgb[2] / sumWeights;
          hdrData[i + 3] = 1;
        }
      }
    }

    return hdrData;
  }

  private getToneMapping(options: ProcessingOptions): THREE.ToneMapping {
    const quality = options.quality || 'medium';
    
    switch (quality) {
      case 'high':
        return THREE.ACESFilmicToneMapping;
      case 'medium':
        return THREE.ReinhardToneMapping;
      case 'low':
        return THREE.LinearToneMapping;
      default:
        return THREE.ReinhardToneMapping;
    }
  }

  private applyToneMapping(
    texture: THREE.Texture,
    toneMapping: THREE.ToneMapping
  ): THREE.Texture {
    const { width, height } = texture.image;
    
    // Setup render target
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });

    // Setup scene for tone mapping
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        exposure: { value: 1.0 }
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
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Apply exposure
          color.rgb *= exposure;
          
          // Apply tone mapping
          ${this.getToneMappingCode(toneMapping)}
          
          gl_FragColor = color;
        }
      `
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Render tone mapped result
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);

    // Create new texture from render target
    const toneMappedTexture = new THREE.Texture(
      this.generateTextureImage(renderTarget)
    );
    toneMappedTexture.needsUpdate = true;

    // Cleanup
    renderTarget.dispose();
    material.dispose();
    quad.geometry.dispose();

    return toneMappedTexture;
  }

  private generateEnvironmentMap(texture: THREE.Texture): THREE.Texture {
    // Generate cubemap
    const envMap = this.pmremGenerator.fromEquirectangular(texture);
    
    // Dispose of original texture
    texture.dispose();
    
    return envMap.texture;
  }

  private getToneMappingCode(toneMapping: THREE.ToneMapping): string {
    switch (toneMapping) {
      case THREE.ACESFilmicToneMapping:
        return `
          // ACES filmic tone mapping
          color.rgb = (color.rgb * (2.51 * color.rgb + 0.03)) /
                     (color.rgb * (2.43 * color.rgb + 0.59) + 0.14);
        `;
      case THREE.ReinhardToneMapping:
        return `
          // Reinhard tone mapping
          color.rgb = color.rgb / (1.0 + color.rgb);
        `;
      default:
        return `
          // Linear tone mapping
          color.rgb = clamp(color.rgb, 0.0, 1.0);
        `;
    }
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
    this.pmremGenerator.dispose();
  }
}