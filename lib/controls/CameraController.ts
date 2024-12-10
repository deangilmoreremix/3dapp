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

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isMultiTouch = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        touchStartX = Math.abs(touch1.clientX - touch2.clientX);
        touchStartY = Math.abs(touch1.clientY - touch2.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMultiTouch && e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const touchCurrentX = Math.abs(touch1.clientX - touch2.clientX);
        const touchCurrentY = Math.abs(touch1.clientY - touch2.clientY);
        
        const startDist = Math.sqrt(touchStartX * touchStartX + touchStartY * touchStartY);
        const currentDist = Math.sqrt(touchCurrentX * touchCurrentX + touchCurrentY * touchCurrentY);
        
        const zoomDelta = (currentDist - startDist) * 0.01;
        this.camera.position.z = Math.max(
          this.controls.minDistance,
          Math.min(this.controls.maxDistance, this.camera.position.z - zoomDelta)
        );
        
        touchStartX = touchCurrentX;
        touchStartY = touchCurrentY;
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
    const curve = new THREE.CatmullRomCurve3(points);
    this.paths.push(curve);
  }

  async animateAlongPath(duration: number = 5000): Promise<void> {
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
          this.camera.position.copy(point);
          this.camera.lookAt(curve.getPoint((progress + 0.1) % 1));
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