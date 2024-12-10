import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export interface CameraControlsOptions {
  autoRotate?: boolean;
  enableDamping?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  dampingFactor?: number;
  rotateSpeed?: number;
  zoomSpeed?: number;
  panSpeed?: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  private paths: THREE.CatmullRomCurve3[] = [];
  private currentPathIndex = 0;
  private isAnimating = false;
  private animationFrame: number | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    options: CameraControlsOptions = {}
  ) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    
    // Apply options
    Object.assign(this.controls, {
      autoRotate: options.autoRotate ?? false,
      enableDamping: options.enableDamping ?? true,
      enableZoom: options.enableZoom ?? true,
      enablePan: options.enablePan ?? true,
      minDistance: options.minDistance ?? 1,
      maxDistance: options.maxDistance ?? 100,
      minPolarAngle: options.minPolarAngle ?? 0,
      maxPolarAngle: options.maxPolarAngle ?? Math.PI,
      dampingFactor: options.dampingFactor ?? 0.05,
      rotateSpeed: options.rotateSpeed ?? 1.0,
      zoomSpeed: options.zoomSpeed ?? 1.0,
      panSpeed: options.panSpeed ?? 1.0
    });

    this.setupTouchControls();
  }

  private setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isMultiTouch = false;
    let initialDistance = 0;
    let initialZoom = 0;

    const getTouchDistance = (e: TouchEvent) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      return Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isMultiTouch = true;
        initialDistance = getTouchDistance(e);
        initialZoom = this.camera.position.z;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMultiTouch && e.touches.length === 2) {
        const currentDistance = getTouchDistance(e);
        const scale = initialDistance / currentDistance;
        
        const newZ = initialZoom * scale;
        this.camera.position.z = Math.max(
          this.controls.minDistance!,
          Math.min(this.controls.maxDistance!, newZ)
        );
        
        this.camera.updateProjectionMatrix();
      }
    };

    const handleTouchEnd = () => {
      isMultiTouch = false;
    };

    this.controls.domElement.addEventListener('touchstart', handleTouchStart);
    this.controls.domElement.addEventListener('touchmove', handleTouchMove);
    this.controls.domElement.addEventListener('touchend', handleTouchEnd);
  }

  addCameraPath(points: THREE.Vector3[]) {
    const curve = new THREE.CatmullRomCurve3(points, true);
    this.paths.push(curve);
  }

  async followPath(duration: number = 5000): Promise<void> {
    if (!this.paths.length || this.isAnimating) return;

    this.isAnimating = true;
    const startTime = Date.now();
    const curve = this.paths[this.currentPathIndex];

    return new Promise((resolve) => {
      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        if (progress < 1) {
          const point = curve.getPoint(progress);
          const lookAtPoint = curve.getPoint((progress + 0.1) % 1);
          
          this.camera.position.copy(point);
          this.camera.lookAt(lookAtPoint);
          this.controls.target.copy(lookAtPoint);
          
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.currentPathIndex = (this.currentPathIndex + 1) % this.paths.length;
          resolve();
        }
      };
      
      animate();
    });
  }

  setTarget(position: THREE.Vector3) {
    this.controls.target.copy(position);
    this.controls.update();
  }

  reset() {
    this.camera.position.set(0, 0, 5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  update() {
    if (this.controls.enableDamping) {
      this.controls.update();
    }
  }

  dispose() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.controls.dispose();
  }
}