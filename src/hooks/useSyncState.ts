import { useEffect, useState } from 'react';
import { supabase, type SyncState } from '../lib/supabase';

// Hook untuk subscribe ke sync_state realtime per kelas
// Guru: update fase pembelajaran → semua siswa terima update otomatis
export function useSyncState(classId: string | null) {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setSyncState(null);
      setLoading(false);
      return;
    }

    // Ambil state awal
    (async () => {
      const { data } = await supabase
        .from('sync_state')
        .select('*')
        .eq('class_id', classId)
        .maybeSingle();
      setSyncState((data as SyncState) ?? null);
      setLoading(false);
    })();

    // Subscribe ke perubahan realtime
    const channel = supabase
      .channel(`sync_state:${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_state',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSyncState(payload.new as SyncState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  // Update fase (untuk guru)
  const updatePhase = async (
    classId: string,
    phase: SyncState['current_phase'],
    userId: string
  ) => {
    // Cek apakah sudah ada record
    const { data: existing } = await supabase
      .from('sync_state')
      .select('id')
      .eq('class_id', classId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('sync_state')
        .update({
          current_phase: phase,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('class_id', classId);
    } else {
      await supabase.from('sync_state').insert({
        class_id: classId,
        current_phase: phase,
        updated_by: userId,
      });
    }
  };

  return { syncState, loading, updatePhase };
}
