import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ProcessingOptions } from '../types';

export class ModelProcessor {
  private loader: GLTFLoader;
  
  constructor() {
    this.loader = new GLTFLoader();
  }

  async loadModel(file: File): Promise<THREE.Group> {
    const url = URL.createObjectURL(file);
    try {
      const gltf = await this.loader.loadAsync(url);
      return gltf.scene;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async processGeometry(
    model: THREE.Group,
    options: ProcessingOptions
  ): Promise<THREE.Group> {
    const simplification = options.processingPreferences?.geometrySimplification || 1;

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Optimize geometry
        if (child.geometry instanceof THREE.BufferGeometry) {
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingSphere();
          child.geometry.computeBoundingBox();
        }

        // Optimize textures
        if (child.material instanceof THREE.Material) {
          const textureQuality = options.processingPreferences?.textureQuality || 1;
          this.optimizeTextures(child.material, textureQuality);
        }
      }
    });

    return model;
  }

  private optimizeTextures(material: THREE.Material, quality: number): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      const textures = [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.aoMap
      ];

      textures.forEach(texture => {
        if (texture && texture instanceof THREE.Texture) {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = quality > 0.5;
        }
      });
    }
  }
}