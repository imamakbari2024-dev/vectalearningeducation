import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Users,
  Trash2,
  Copy,
  Check,
  FolderOpen,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  createClass,
  fetchTeacherClasses,
  fetchClassStudents,
  deleteClass,
} from '../../lib/classManager';
import { type ClassRoom, type Profile } from '../../lib/supabase';

export default function GuruKelasPage() {
  const profile = useAppStore((s) => s.profile);
  const setActiveClass = useAppStore((s) => s.setActiveClass);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);

  const loadClasses = useCallback(async () => {
    if (!profile) return;
    const cls = await fetchTeacherClasses(profile.id);
    setClasses(cls);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || newName.trim().length < 2) return;
    setCreating(true);
    setError(null);
    const { data, error } = await createClass(newName.trim(), profile.id);
    if (error) {
      setError(error);
      setCreating(false);
    } else if (data) {
      setClasses((prev) => [data, ...prev]);
      setActiveClass(data);
      setNewName('');
      setShowCreate(false);
      setCreating(false);
    }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm('Hapus kelas ini? Semua materi dan data siswa akan terhapus.')) return;
    const { error } = await deleteClass(classId);
    if (!error) {
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      if (selectedClass?.id === classId) setSelectedClass(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kelas Saya
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kelola kelas, bagikan kode ke siswa, dan lihat roster
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Buat Kelas Baru
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <FolderOpen className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Belum ada kelas
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Buat kelas pertama Anda untuk memulai mengajar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <div key={cls.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 cursor-pointer"
                  onClick={() => {
                    setActiveClass(cls);
                    setSelectedClass(cls);
                  }}
                >
                  <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <button
                  onClick={() => handleDelete(cls.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <h3
                className="mt-3 cursor-pointer font-semibold text-gray-900 dark:text-white"
                onClick={() => {
                  setActiveClass(cls);
                  setSelectedClass(cls);
                }}
              >
                {cls.name}
              </h3>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Kode:
                  </span>
                  <span className="font-mono text-sm font-bold tracking-wider text-gray-900 dark:text-white">
                    {cls.class_code}
                  </span>
                  <button
                    onClick={() => copyCode(cls.class_code)}
                    className="ml-1 text-gray-400 hover:text-primary-600"
                  >
                    {copiedCode === cls.class_code ? (
                      <Check className="h-3.5 w-3.5 text-success-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveClass(cls);
                  setSelectedClass(cls);
                }}
                className="mt-4 flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Lihat Roster Siswa
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Roster panel */}
      {selectedClass && (
        <RosterPanel cls={selectedClass} onClose={() => setSelectedClass(null)} />
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Buat Kelas Baru
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="contoh: Matematika 10A"
                  className="input-field"
                  autoFocus
                  required
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Kode kelas 6 karakter akan dibuat otomatis
                </p>
              </div>
              {error && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/20 dark:text-error-400">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    'Buat Kelas'
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

function RosterPanel({
  cls,
  onClose,
}: {
  cls: ClassRoom;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await fetchClassStudents(cls.id);
      setStudents(s);
      setLoading(false);
    })();
  }, [cls.id]);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Roster — {cls.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kode: <span className="font-mono font-bold">{cls.class_code}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
          <Users className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Belum ada siswa terdaftar. Bagikan kode kelas{' '}
            <span className="font-mono font-bold">{cls.class_code}</span> ke
            siswa Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <Link
              key={student.id}
              to={`/guru/siswa/${student.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-100 text-xs font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
                  {student.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {student.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Siswa
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
