import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, ClassRoom } from '../lib/supabase';

interface AppState {
  // Tema
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (t: 'light' | 'dark') => void;

  // Auth
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;

  // Kelas aktif
  activeClassId: string | null;
  activeClass: ClassRoom | null;
  setActiveClass: (cls: ClassRoom | null) => void;

  // Mode Fokus (Widget Fokus siswa)
  focusMode: boolean;
  toggleFocusMode: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next === 'dark');
          }
          return { theme: next };
        }),
      setTheme: (t) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', t === 'dark');
        }
        set({ theme: t });
      },

      profile: null,
      setProfile: (p) => set({ profile: p }),

      activeClassId: null,
      activeClass: null,
      setActiveClass: (cls) =>
        set({ activeClass: cls, activeClassId: cls?.id ?? null }),

      focusMode: false,
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    {
      name: 'vecta-storage',
      partialize: (s) => ({
        theme: s.theme,
        activeClassId: s.activeClassId,
        activeClass: s.activeClass,
      }),
    }
  )
);
