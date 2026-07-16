import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

export type GestureType = 'none' | 'fist' | 'pinch' | 'open';

export interface HandTrackingState {
  gesture: GestureType;
  pinchDistance: number; // 0..1 normalized
  handPresent: boolean;
}

interface UseHandTrackingOptions {
  onGesture?: (state: HandTrackingState) => void;
}

// Hook untuk MediaPipe Hand Landmark extraction client-side
export function useHandTracking({ onGesture }: UseHandTrackingOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;

  // Inisialisasi webcam + MediaPipe
  const startCamera = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);

    try {
      // Request webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Load MediaPipe tasks-vision
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      landmarkerRef.current = landmarker;
      setStatus('ready');

      // Start detection loop
      detectLoop();
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal mengaktifkan kamera. Pastikan izin kamera diberikan.'
      );
    }
  }, []);

  // Deteksi gesture dari landmark
  const detectGesture = useCallback(
    (result: HandLandmarkerResult | null): HandTrackingState => {
      if (!result || !result.landmarks || result.landmarks.length === 0) {
        return { gesture: 'none', pinchDistance: 0, handPresent: false };
      }

      const landmarks = result.landmarks[0]; // 21 landmark per tangan
      if (!landmarks || landmarks.length < 21) {
        return { gesture: 'none', pinchDistance: 0, handPresent: false };
      }

      // Landmark indices:
      // 0: wrist, 4: thumb tip, 8: index tip, 12: middle tip, 16: ring tip, 20: pinky tip
      // 5: index MCP, 9: middle MCP, 13: ring MCP, 17: pinky MCP
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const indexMcp = landmarks[5];
      const middleMcp = landmarks[9];
      const ringMcp = landmarks[13];
      const pinkyMcp = landmarks[17];

      // Hitung jarak pinch (thumb tip ke index tip) — normalisasi 0..1
      const pinchDist = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) +
          Math.pow(thumbTip.y - indexTip.y, 2)
      );
      // Normalisasi: jarak < 0.05 = pinch rapat, > 0.15 = terbuka
      const pinchNormalized = Math.max(0, Math.min(1, (0.15 - pinchDist) / 0.10));

      // Cek apakah jari terbuka (tip lebih tinggi dari MCP dalam koordinat y)
      // Dalam koordinat MediaPipe, y menurun ke bawah
      const indexExtended = indexTip.y < indexMcp.y;
      const middleExtended = middleTip.y < middleMcp.y;
      const ringExtended = ringTip.y < ringMcp.y;
      const pinkyExtended = pinkyTip.y < pinkyMcp.y;
      const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(
        Boolean
      ).length;

      // Fist: semua jari tertekuk (tip di bawah MCP)
      const isFist = extendedCount === 0;

      // Pinch: thumb dan index dekat, jari lain bisa bebas
      const isPinch = pinchDist < 0.05;

      let gesture: GestureType = 'none';
      if (isFist) gesture = 'fist';
      else if (isPinch) gesture = 'pinch';
      else if (extendedCount >= 3) gesture = 'open';

      return {
        gesture,
        pinchDistance: pinchNormalized,
        handPresent: true,
      };
    },
    []
  );

  // Loop deteksi frame-by-frame
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const canvas = canvasRef.current;

    if (!video || !landmarker || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);

    // Gambar landmark di canvas overlay
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (result.landmarks && result.landmarks.length > 0) {
        drawLandmarks(ctx, result.landmarks[0], canvas.width, canvas.height);
      }
    }

    const state = detectGesture(result);
    onGestureRef.current?.(state);

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [detectGesture]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
    setStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (landmarkerRef.current) landmarkerRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    errorMsg,
    startCamera,
    stopCamera,
  };
}

// Gambar landmark tangan di canvas overlay
function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number }[],
  width: number,
  height: number
) {
  // Koneksi antar landmark (simplified hand skeleton)
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // index
    [5, 9], [9, 10], [10, 11], [11, 12], // middle
    [9, 13], [13, 14], [14, 15], [15, 16], // ring
    [13, 17], [17, 18], [18, 19], [19, 20], // pinky
    [0, 17], // palm
  ];

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.lineWidth = 2;
  for (const [a, b] of connections) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}
