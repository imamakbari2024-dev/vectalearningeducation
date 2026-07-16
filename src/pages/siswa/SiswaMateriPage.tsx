import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Loader2,
  X,
  KeyRound,
  FolderOpen,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { joinClassByCode, fetchStudentClasses } from '../../lib/classManager';
import { type ClassRoom } from '../../lib/supabase';

export default function SiswaMateriPage() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const setActiveClass = useAppStore((s) => s.setActiveClass);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    if (!profile) return;
    const cls = await fetchStudentClasses(profile.id);
    setClasses(cls);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || joinCode.trim().length !== 6) {
      setJoinError('Kode kelas harus 6 karakter.');
      return;
    }
    setJoining(true);
    setJoinError(null);
    setJoinSuccess(null);
    const { data, error } = await joinClassByCode(joinCode, profile.id);
    if (error && !data) {
      setJoinError(error);
      setJoining(false);
    } else {
      setJoinSuccess(`Berhasil bergabung ke kelas "${data?.name}"!`);
      setJoinCode('');
      setJoining(false);
      await loadClasses();
      setTimeout(() => {
        setShowJoin(false);
        setJoinSuccess(null);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Akses Materi
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pilih kelas untuk mengakses materi pembelajaran
          </p>
        </div>
        <button onClick={() => setShowJoin(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Gabung Kelas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <BookOpen className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Belum terdaftar di kelas mana pun
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Masukkan kode kelas dari guru Anda untuk mulai mengakses materi
            pembelajaran
          </p>
          <button
            onClick={() => setShowJoin(true)}
            className="btn-primary mt-4"
          >
            <KeyRound className="h-4 w-4" />
            Masukkan Kode Kelas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className={`card p-5 transition-all ${
                activeClass?.id === cls.id
                  ? 'ring-2 ring-primary-500'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                {activeClass?.id === cls.id && (
                  <span className="flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-900/30 dark:text-success-400">
                    <Check className="h-3 w-3" />
                    Aktif
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                {cls.name}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Kode: {cls.class_code}
              </p>
              <button
                onClick={() => setActiveClass(cls)}
                className="btn-secondary mt-4 w-full"
              >
                Pilih Kelas Ini
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowJoin(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gabung Kelas
              </h2>
              <button
                onClick={() => setShowJoin(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kode Kelas
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="ABCDEF"
                  className="input-field text-center font-mono text-lg tracking-[0.3em]"
                  maxLength={6}
                  autoFocus
                  required
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Masukkan 6 karakter kode dari guru Anda
                </p>
              </div>
              {joinError && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/20 dark:text-error-400">
                  {joinError}
                </div>
              )}
              {joinSuccess && (
                <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-900/20 dark:text-success-400">
                  {joinSuccess}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="btn-primary flex-1"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Bergabung...
                    </>
                  ) : (
                    'Gabung'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
