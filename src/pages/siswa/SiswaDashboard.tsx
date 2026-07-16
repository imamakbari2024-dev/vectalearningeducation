import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  GitBranch,
  Radio,
} from 'lucide-react';
import {
  supabase,
  type ClassRoom,
  type Submission,
  type StepProgress,
} from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { useSyncState } from '../../hooks/useSyncState';

export default function SiswaDashboard() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassRoom[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile) return;

      // Ambil kelas tempat siswa terdaftar
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', profile.id);

      if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map((e) => e.class_id);
        const { data: cls } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds)
          .order('created_at', { ascending: false });
        setEnrolledClasses((cls ?? []) as ClassRoom[]);
      }

      // Ambil semua submission siswa untuk nilai rata-rata
      const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', profile.id);
      if (submissions && submissions.length > 0) {
        const total = submissions.reduce(
          (sum, s) => sum + (s as Submission).score,
          0
        );
        setAvgScore(Math.round(total / submissions.length));
      } else {
        setAvgScore(null);
      }

      // Ambil progres langkah belajar
      const { data: prog } = await supabase
        .from('step_progress')
        .select('*')
        .eq('student_id', profile.id);
      const progData = (prog ?? []) as StepProgress[];
      const completed = progData.filter((p) => p.status === 'completed').length;
      setProgress({ completed, total: progData.length });

      setLoading(false);
    })();
  }, [profile]);

  const progressPct =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  const stats = [
    {
      label: 'Kelas Diikuti',
      value: enrolledClasses.length,
      icon: BookOpen,
      color: 'primary',
    },
    {
      label: 'Nilai Rata-rata',
      value: avgScore !== null ? `${avgScore}` : '—',
      icon: Award,
      color: 'success',
    },
    {
      label: 'Langkah Selesai',
      value: `${progress.completed}/${progress.total}`,
      icon: TrendingUp,
      color: 'accent',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Halo, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Lanjutkan perjalanan belajarmu hari ini
        </p>
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

      {/* Sync state indicator */}
      <SyncIndicator />

      {/* Progress card */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Progres Pembelajaran Bab
            </h2>
          </div>
          <Link
            to="/siswa/alur"
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Lanjutkan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {progress.total === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
            <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeClass
                ? 'Belum ada langkah belajar di kelas ini.'
                : 'Pilih kelas untuk melihat progres pembelajaran.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {progress.completed} dari {progress.total} langkah selesai
              </span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                {progressPct}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Enrolled classes */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Kelas yang Diikuti
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : enrolledClasses.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum terdaftar di kelas mana pun. Masukkan kode kelas dari guru
              Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {enrolledClasses.map((cls) => (
              <Link
                key={cls.id}
                to="/siswa/materi"
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                    <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {cls.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Kode: {cls.class_code}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'Menunggu', color: 'gray' },
  pretest: { label: 'Pretest Dimulai', color: 'warning' },
  material: { label: 'Sedang Belajar Materi', color: 'primary' },
  explore3d: { label: 'Eksplorasi 3D', color: 'accent' },
  posttest: { label: 'Posttest Dimulai', color: 'success' },
};

function SyncIndicator() {
  const activeClass = useAppStore((s) => s.activeClass);
  const { syncState } = useSyncState(activeClass?.id ?? null);

  if (!activeClass || !syncState || syncState.current_phase === 'idle') return null;

  const phase = PHASE_LABELS[syncState.current_phase] ?? PHASE_LABELS.idle;

  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <Radio className="h-5 w-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {phase.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Guru memulai fase sinkron untuk kelas {activeClass.name}
        </p>
      </div>
      <span className="flex items-center gap-1.5 rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-900/30 dark:text-success-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
        Live
      </span>
    </div>
  );
}
