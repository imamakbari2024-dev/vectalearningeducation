import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { Play, Pause, RotateCcw, Eye, EyeOff } from 'lucide-react';

// Widget Fokus: Pomodoro timer + Mode Fokus toggle
export default function FocusWidget() {
  const focusMode = useAppStore((s) => s.focusMode);
  const toggleFocusMode = useAppStore((s) => s.toggleFocusMode);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 menit default
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [duration, setDuration] = useState(25);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = mode === 'focus'
    ? ((duration * 60 - timeLeft) / (duration * 60)) * 100
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Waktu habis — ganti mode
          if (mode === 'focus') {
            setMode('break');
            setTimeLeft(5 * 60);
          } else {
            setMode('focus');
            setTimeLeft(duration * 60);
          }
          setIsRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, mode, duration]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setMode('focus');
    setTimeLeft(duration * 60);
  }, [duration]);

  const handleDurationChange = (newDur: number) => {
    setDuration(newDur);
    if (mode === 'focus') setTimeLeft(newDur * 60);
    setIsRunning(false);
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Widget Fokus
        </h3>
        <button
          onClick={toggleFocusMode}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            focusMode
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {focusMode ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {focusMode ? 'Mode Fokus Aktif' : 'Aktifkan Mode Fokus'}
        </button>
      </div>

      {/* Timer display */}
      <div className="relative mb-4 flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              strokeWidth="6"
              className="stroke-gray-200 dark:stroke-gray-800"
            />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className={mode === 'focus' ? 'stroke-primary-500' : 'stroke-success-500'}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className={`text-xs font-medium ${mode === 'focus' ? 'text-primary-500' : 'text-success-500'}`}>
              {mode === 'focus' ? 'Fokus' : 'Istirahat'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setIsRunning((r) => !r)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <button
          onClick={handleReset}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Duration presets */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {[15, 25, 45].map((d) => (
          <button
            key={d}
            onClick={() => handleDurationChange(d)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              duration === d
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {d}m
          </button>
        ))}
      </div>
    </div>
  );
}
