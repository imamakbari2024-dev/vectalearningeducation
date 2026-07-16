import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

// Hook untuk monitoring perilaku siswa saat ujian menggunakan Page Visibility API
// Mencatat event visibilitychange, blur, focus ke tabel monitoring_logs
export function useExamMonitoring(active: boolean, classId: string | null) {
  const profile = useAppStore((s) => s.profile);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (!active || !classId || !profileRef.current) return;

    const logEvent = async (
      eventType: 'visibilitychange' | 'blur' | 'focus',
      detail: string
    ) => {
      await supabase.from('monitoring_logs').insert({
        student_id: profileRef.current!.id,
        class_id: classId,
        event_type: eventType,
        event_detail: detail,
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('visibilitychange', 'Siswa berpindah tab atau meminimalkan jendela saat ujian');
      } else {
        logEvent('visibilitychange', 'Siswa kembali ke tab ujian');
      }
    };

    const handleBlur = () => {
      logEvent('blur', 'Jendela kehilangan fokus');
    };

    const handleFocus = () => {
      logEvent('focus', 'Jendela mendapatkan kembali fokus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [active, classId]);
}
