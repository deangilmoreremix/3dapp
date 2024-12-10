import { Collection, CaptureVersion, UploadRequest, UploadResponse } from '../types';

export class CaptureService {
  private captures: Map<string, UploadResponse> = new Map();
  private collections: Map<string, Collection> = new Map();
  private versions: Map<string, CaptureVersion[]> = new Map();

  async createCapture(data: UploadRequest): Promise<UploadResponse> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const capture: UploadResponse = {
      id,
      status: 'ready',
      url: `https://example.com/captures/${id}`,
      thumbnailUrl: `https://example.com/captures/${id}/thumbnail.jpg`,
      collection: data.collection,
      tags: data.tags,
      description: data.description,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      owner: 'current-user',
      viewCount: 0,
      downloadCount: 0,
      processingDetails: {
        fileSize: data.file.size,
        format: this.getFileFormat(data.file),
        quality: data.processingOptions?.quality || 'medium',
        optimizedForWeb: data.processingOptions?.optimizeForWeb || false,
        hasBackground: !data.removeBackground,
        dimensions: await this.getFileDimensions(data.file)
      }
    };

    this.captures.set(id, capture);
    
    if (data.collection) {
      await this.addToCollection(id, data.collection);
    }

    return capture;
  }

  async getCapture(id: string): Promise<UploadResponse | null> {
    return this.captures.get(id) || null;
  }

  async updateCapture(id: string, data: Partial<UploadRequest>): Promise<UploadResponse> {
    const capture = await this.getCapture(id);
    if (!capture) throw new Error('Capture not found');

    const updated = {
      ...capture,
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.captures.set(id, updated);
    return updated;
  }

  async deleteCapture(id: string): Promise<void> {
    const capture = await this.getCapture(id);
    if (!capture) return;

    if (capture.collection) {
      await this.removeFromCollection(id, capture.collection);
    }

    this.captures.delete(id);
    this.versions.delete(id);
  }

  async createCollection(name: string, isPublic = false): Promise<Collection> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const collection: Collection = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      owner: 'current-user',
      captures: [],
      isPublic
    };

    this.collections.set(id, collection);
    return collection;
  }

  async addToCollection(captureId: string, collectionId: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection) throw new Error('Collection not found');

    if (!collection.captures.includes(captureId)) {
      collection.captures.push(captureId);
      collection.updatedAt = new Date().toISOString();
      this.collections.set(collectionId, collection);
    }
  }

  async removeFromCollection(captureId: string, collectionId: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection) return;

    collection.captures = collection.captures.filter(id => id !== captureId);
    collection.updatedAt = new Date().toISOString();
    this.collections.set(collectionId, collection);
  }

  async createVersion(captureId: string, data: UploadRequest): Promise<CaptureVersion> {
    const capture = await this.getCapture(captureId);
    if (!capture) throw new Error('Capture not found');

    const versions = this.versions.get(captureId) || [];
    const newVersion: CaptureVersion = {
      id: crypto.randomUUID(),
      captureId,
      version: `1.${versions.length + 1}.0`,
      createdAt: new Date().toISOString(),
      changes: ['Updated processing options'],
      processingOptions: data.processingOptions!,
      url: `https://example.com/captures/${captureId}/versions/${versions.length + 1}`,
      thumbnailUrl: `https://example.com/captures/${captureId}/versions/${versions.length + 1}/thumbnail.jpg`
    };

    versions.push(newVersion);
    this.versions.set(captureId, versions);
    return newVersion;
  }

  private async getFileDimensions(file: File): Promise<{ width: number; height: number }> {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);
      });
    }
    return { width: 1920, height: 1080 }; // Default for non-images
  }

  private getFileFormat(file: File): string {
    if (file.type.startsWith('image/')) return file.type.split('/')[1];
    if (file.type.startsWith('video/')) return file.type.split('/')[1];
    if (file.name.endsWith('.glb')) return 'glb';
    if (file.name.endsWith('.gltf')) return 'gltf';
    return 'unknown';
  }
}