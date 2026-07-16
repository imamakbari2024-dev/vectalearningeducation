import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FolderOpen,
  FileText,
  Plus,
  ArrowRight,
  Radio,
  Play,
  Pause,
} from 'lucide-react';
import { supabase, type ClassRoom } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { useSyncState } from '../../hooks/useSyncState';

export default function GuruDashboard() {
  const profile = useAppStore((s) => s.profile);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });
      setClasses((cls ?? []) as ClassRoom[]);

      if (cls && cls.length > 0) {
        const classIds = cls.map((c) => c.id);
        const { count: studentCount } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds);
        setTotalStudents(studentCount ?? 0);

        const { count: matCount } = await supabase
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds);
        setTotalMaterials(matCount ?? 0);
      }
      setLoading(false);
    })();
  }, [profile]);

  const stats = [
    {
      label: 'Total Kelas',
      value: classes.length,
      icon: FolderOpen,
      color: 'primary',
    },
    {
      label: 'Total Siswa',
      value: totalStudents,
      icon: Users,
      color: 'secondary',
    },
    {
      label: 'Materi Diunggah',
      value: totalMaterials,
      icon: FileText,
      color: 'accent',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Selamat datang, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ringkasan aktivitas mengajar Anda
          </p>
        </div>
        <Link to="/guru/kelas" className="btn-primary">
          <Plus className="h-4 w-4" />
          Buat Kelas Baru
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '—' : stat.value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
              >
                <stat.icon
                  className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Synchronous Mode control */}
      <SyncControlPanel />

      {/* Classes list */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kelas Saya
          </h2>
          <Link
            to="/guru/kelas"
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada kelas. Buat kelas pertama Anda untuk memulai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.slice(0, 5).map((cls) => (
              <ClassRow key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PHASES = [
  { value: 'idle', label: 'Idle', color: 'gray' },
  { value: 'pretest', label: 'Mulai Pretest', color: 'warning' },
  { value: 'material', label: 'Lanjut ke Materi', color: 'primary' },
  { value: 'explore3d', label: 'Eksplorasi 3D', color: 'accent' },
  { value: 'posttest', label: 'Posttest', color: 'success' },
] as const;

function SyncControlPanel() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const { syncState, updatePhase } = useSyncState(activeClass?.id ?? null);

  if (!activeClass) return null;

  const currentPhase = syncState?.current_phase ?? 'idle';

  const handlePhaseChange = async (phase: typeof currentPhase) => {
    if (!activeClass || !profile) return;
    await updatePhase(activeClass.id, phase, profile.id);
  };

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mode Sinkronisasi
        </h2>
        <span className="ml-2 flex items-center gap-1.5 rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-900/30 dark:text-success-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
          Live
        </span>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Kelas: <span className="font-medium text-gray-900 dark:text-white">{activeClass.name}</span>
        {' · '}
        Fase saat ini: <span className="font-medium text-primary-600 dark:text-primary-400">{currentPhase}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {PHASES.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePhaseChange(p.value)}
            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
              currentPhase === p.value
                ? `border-${p.color}-500 bg-${p.color}-50 dark:bg-${p.color}-900/20`
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
          >
            {p.value === 'idle' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Semua siswa yang terhubung akan otomatis berpindah fase tanpa perlu refresh
      </p>
    </div>
  );
}

function ClassRow({ cls }: { cls: ClassRoom }) {
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id);
      setStudentCount(count ?? 0);
    })();
  }, [cls.id]);

  return (
    <Link
      to="/guru/kelas"
      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{cls.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kode: {cls.class_code}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Users className="h-4 w-4" />
          {studentCount ?? '...'}
        </span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </Link>
  );
}
