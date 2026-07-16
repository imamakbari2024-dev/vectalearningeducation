import { useEffect, useState } from 'react';
import { Menu, ChevronDown, Check, FolderOpen } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { type ClassRoom } from '../lib/supabase';
import { fetchStudentClasses, fetchTeacherClasses } from '../lib/classManager';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const setActiveClass = useAppStore((s) => s.setActiveClass);
  const focusMode = useAppStore((s) => s.focusMode);
  const { signOut } = useAuth();
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [classes, setClasses] = useState<ClassRoom[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const cls =
        profile.role === 'guru'
          ? await fetchTeacherClasses(profile.id)
          : await fetchStudentClasses(profile.id);
      setClasses(cls);
    })();
  }, [profile]);

  if (focusMode) {
    return (
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Mode Fokus Aktif
        </span>
        <ThemeToggle />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Class selector */}
        <div className="relative">
          <button
            onClick={() => setClassMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                activeClass ? 'bg-success-500' : 'bg-gray-400'
              }`}
            />
            <span className="max-w-[150px] truncate">
              {activeClass ? activeClass.name : 'Pilih Kelas'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {classMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setClassMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {profile?.role === 'guru' ? 'Kelas Saya' : 'Kelas Diikuti'}
                </p>
                {classes.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    Belum ada kelas tersedia
                  </p>
                ) : (
                  <div className="max-h-60 space-y-0.5 overflow-y-auto">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setActiveClass(cls);
                          setClassMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {cls.name}
                          </span>
                        </span>
                        {activeClass?.id === cls.id && (
                          <Check className="h-4 w-4 text-primary-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {activeClass && (
                  <button
                    onClick={() => {
                      setActiveClass(null);
                      setClassMenuOpen(false);
                    }}
                    className="mt-1 w-full border-t border-gray-100 px-3 py-2 text-left text-xs text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:hover:text-gray-300"
                  >
                    Hapus pilihan kelas
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">
          {profile?.full_name}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
