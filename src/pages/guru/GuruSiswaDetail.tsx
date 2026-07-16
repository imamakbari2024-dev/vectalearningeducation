import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase, type Profile, type Submission, type MonitoringLog, type Test } from '../../lib/supabase';

export default function GuruSiswaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<(Submission & { test?: Test })[]>([]);
  const [logs, setLogs] = useState<MonitoringLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      // Ambil profil siswa
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (prof) setStudent(prof as Profile);

      // Ambil semua submission siswa + join test
      const { data: subs } = await supabase
        .from('submissions')
        .select('*, test:tests(*)')
        .eq('student_id', id)
        .order('submitted_at', { ascending: false });
      setSubmissions((subs ?? []) as (Submission & { test?: Test })[]);

      // Ambil log monitoring siswa
      const { data: logData } = await supabase
        .from('monitoring_logs')
        .select('*')
        .eq('student_id', id)
        .order('logged_at', { ascending: false })
        .limit(50);
      setLogs((logData ?? []) as MonitoringLog[]);

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Data siswa tidak ditemukan
        </p>
        <Link to="/guru/kelas" className="btn-secondary mt-4">
          Kembali ke Kelas
        </Link>
      </div>
    );
  }

  const avgScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length
        )
      : null;

  const initials = student.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      {/* Student header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-xl font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {student.full_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Siswa</p>
          </div>
          {avgScore !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nilai Rata-rata
              </p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {avgScore}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scores */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nilai & Hasil Test
            </h2>
          </div>
          {submissions.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Belum ada hasil test
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {sub.test?.title ?? 'Test tidak ditemukan'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sub.test?.type === 'pretest'
                        ? 'Pretest'
                        : sub.test?.type === 'posttest'
                        ? 'Posttest'
                        : 'Quiz'}{' '}
                      ·{' '}
                      {new Date(sub.submitted_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                      sub.score >= 75
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                        : sub.score >= 50
                        ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                        : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                    }`}
                  >
                    {sub.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monitoring logs */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Log Monitoring
            </h2>
          </div>
          {logs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
              <EyeOff className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tidak ada aktivitas mencurigakan tercatat
              </p>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      log.event_type === 'visibilitychange' || log.event_type === 'face_absent'
                        ? 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'
                        : 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400'
                    }`}
                  >
                    {log.event_type === 'visibilitychange' ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.event_type === 'visibilitychange'
                        ? 'Berpindah/meminimalkan tab'
                        : log.event_type === 'blur'
                        ? 'Jendela kehilangan fokus'
                        : log.event_type === 'focus'
                        ? 'Kembali ke jendela'
                        : 'Wajah tidak terdeteksi'}
                    </p>
                    {log.event_detail && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {log.event_detail}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(log.logged_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
