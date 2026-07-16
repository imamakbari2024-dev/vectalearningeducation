import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Camera,
  CameraOff,
  Loader2,
  AlertCircle,
  Hand,
  Info,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { supabase, type Material } from '../../lib/supabase';
import { useHandTracking, type GestureType, type HandTrackingState } from '../../hooks/useHandTracking';
import Model3DViewer, { NoModelPlaceholder } from '../../components/Model3DViewer';

export default function Siswa3DViewerPage() {
  const activeClass = useAppStore((s) => s.activeClass);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [gesture, setGesture] = useState<GestureType>('none');
  const [pinchDistance, setPinchDistance] = useState(0);

  const handleGesture = useCallback((state: HandTrackingState) => {
    setGesture(state.gesture);
    setPinchDistance(state.pinchDistance);
  }, []);

  const { videoRef, canvasRef, status, errorMsg, startCamera, stopCamera } = useHandTracking({
    onGesture: handleGesture,
  });

  const loadMaterials = useCallback(async () => {
    if (!activeClass) return;
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('class_id', activeClass.id)
      .eq('type', 'model3d')
      .order('order_index');
    const mats = (data ?? []) as Material[];
    setMaterials(mats);
    if (mats.length > 0) setSelectedMaterial(mats[0]);
    setLoading(false);
  }, [activeClass]);

  useEffect(() => {
    if (activeClass) {
      setLoading(true);
      loadMaterials();
    }
  }, [activeClass, loadMaterials]);

  const toggleCamera = async () => {
    if (cameraEnabled) {
      stopCamera();
      setCameraEnabled(false);
      setGesture('none');
    } else {
      await startCamera();
      setCameraEnabled(status !== 'error');
    }
  };

  // Sync cameraEnabled with status changes
  useEffect(() => {
    if (status === 'ready') setCameraEnabled(true);
    if (status === 'error' || status === 'idle') setCameraEnabled(false);
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Eksplorasi 3D
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Jelajahi model 3D dengan gesture tangan — kepalan untuk rotasi, cubit untuk zoom
          </p>
        </div>
      </div>

      {/* Gesture guide */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Hand className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Kepalan Tangan</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rotasi model 360°</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900/30">
            <Hand className="h-5 w-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Cubit (Jempol + Telunjuk)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Zoom in / out</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/30">
            <Hand className="h-5 w-5 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Tangan Terbuka</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hentikan rotasi otomatis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* 3D Canvas */}
        <div className="lg:col-span-3">
          <div className="card h-[500px] overflow-hidden p-0">
            {selectedMaterial ? (
              <Model3DViewer
                modelUrl={selectedMaterial.file_url}
                gesture={gesture}
                pinchDistance={pinchDistance}
              />
            ) : (
              <NoModelPlaceholder />
            )}
          </div>

          {/* Model selector */}
          {materials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {materials.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => setSelectedMaterial(mat)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all ${
                    selectedMaterial?.id === mat.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <Box className="h-4 w-4 text-accent-500" />
                  {mat.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Camera panel */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Kontrol Gesture
            </h3>

            {/* Webcam preview */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-900">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                width={640}
                height={480}
              />

              {status === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <Camera className="mb-2 h-8 w-8" />
                  <p className="text-xs">Kamera belum aktif</p>
                </div>
              )}

              {status === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                  <p className="text-xs">Memuat kamera & model AI...</p>
                </div>
              )}

              {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-error-900/80 p-4 text-center text-white">
                  <AlertCircle className="mb-2 h-8 w-8 text-error-400" />
                  <p className="text-xs">{errorMsg ?? 'Gagal mengaktifkan kamera'}</p>
                </div>
              )}

              {status === 'ready' && (
                <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-success-500/80 px-2 py-1 text-xs text-white backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </div>
              )}
            </div>

            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              disabled={status === 'loading'}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${
                cameraEnabled
                  ? 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat...
                </>
              ) : cameraEnabled ? (
                <>
                  <CameraOff className="h-4 w-4" />
                  Matikan Kamera
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Aktifkan Kamera
                </>
              )}
            </button>

            {/* Current gesture */}
            <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                Gesture Terdeteksi
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-2.5 w-2.5 rounded-full ${
                    gesture !== 'none' ? 'bg-success-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {gesture === 'fist' && 'Kepalan'}
                  {gesture === 'pinch' && 'Cubit'}
                  {gesture === 'open' && 'Tangan Terbuka'}
                  {gesture === 'none' && 'Tidak ada'}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary-50 p-3 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Pastikan tangan terlihat jelas di kamera dan pencahayaan cukup.
                Anda juga bisa rotasi/zoom manual dengan mouse.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
