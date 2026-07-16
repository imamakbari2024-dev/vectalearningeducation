import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Html, useProgress } from '@react-three/drei';
import type * as THREE from 'three';
import { Loader2, Box } from 'lucide-react';
import type { GestureType, HandTrackingState } from '../hooks/useHandTracking';

interface Model3DViewerProps {
  modelUrl: string;
  gesture: GestureType;
  pinchDistance: number;
}

// Komponen untuk load dan render model GLB/GLTF
function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.5} />;
}

// Loading fallback
function ModelLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Memuat model 3D... {Math.round(progress)}%
        </p>
      </div>
    </Html>
  );
}

export default function Model3DViewer({ modelUrl, gesture, pinchDistance }: Model3DViewerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [targetZoom, setTargetZoom] = useState(5);
  const gestureRef = useRef<HandTrackingState>({ gesture: 'none', pinchDistance: 0, handPresent: false });

  // Update gesture ref
  gestureRef.current = { gesture, pinchDistance, handPresent: gesture !== 'none' };

  // Fist gesture → rotate 360 degrees
  useEffect(() => {
    if (gesture === 'fist') {
      setAutoRotate(true);
      setRotationSpeed(0.05);
    } else if (gesture === 'open') {
      setAutoRotate(false);
      setRotationSpeed(0);
    }
  }, [gesture]);

  // Pinch gesture → zoom in/out
  useEffect(() => {
    if (gesture === 'pinch') {
      // pinchDistance 0..1 → zoom 8 (jauh) to 2 (dekat)
      const newZoom = 8 - pinchDistance * 6;
      setTargetZoom(newZoom);
    }
  }, [gesture, pinchDistance]);

  // Animation loop for rotation
  useFrameLoop(() => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += rotationSpeed;
    }
    if (controlsRef.current) {
      // Smooth zoom
      const currentDist = controlsRef.current.getDistance();
      const diff = targetZoom - currentDist;
      if (Math.abs(diff) > 0.01) {
        controlsRef.current.dollyTo(currentDist + diff * 0.1);
      }
    }
  });

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        className="rounded-lg"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />

        <group ref={groupRef}>
          <SuspenseWithModel url={modelUrl} />
        </group>

        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />
        <Environment preset="city" />

        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>

      {/* Gesture indicator overlay */}
      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            gesture !== 'none' ? 'bg-success-400' : 'bg-gray-500'
          }`}
        />
        {gesture === 'fist' && 'Gesture: Kepalan → Rotasi 360°'}
        {gesture === 'pinch' && 'Gesture: Cubit → Zoom'}
        {gesture === 'open' && 'Gesture: Tangan Terbuka → Berhenti rotasi'}
        {gesture === 'none' && 'Tidak ada tangan terdeteksi'}
      </div>
    </div>
  );
}

function SuspenseWithModel({ url }: { url: string }) {
  return (
    <>
      <ModelLoader />
      <GLBModel url={url} />
    </>
  );
}

// Hook untuk menjalankan callback setiap frame tanpa re-render
function useFrameLoop(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let raf: number;
    const loop = () => {
      callbackRef.current();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

// Placeholder ketika tidak ada model
export function NoModelPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <Box className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Belum ada model 3D dipilih
      </p>
    </div>
  );
}
