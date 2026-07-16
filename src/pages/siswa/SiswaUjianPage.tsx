import { useEffect, useState, useCallback } from 'react';
import {
  FileQuestion,
  Loader2,
  ClipboardCheck,
  FileCheck,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { supabase, type Test } from '../../lib/supabase';
import { useExamMonitoring } from '../../hooks/useExamMonitoring';

const testTypeMeta = {
  pretest: { label: 'Pretest', icon: ClipboardCheck, color: 'warning' },
  posttest: { label: 'Posttest', icon: FileCheck, color: 'success' },
  quiz: { label: 'Quiz', icon: HelpCircle, color: 'primary' },
} as const;

export default function SiswaUjianPage() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [violationCount, setViolationCount] = useState(0);

  const loadTests = useCallback(async () => {
    if (!activeClass) return;
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('class_id', activeClass.id)
      .order('created_at', { ascending: false });
    setTests((data ?? []) as Test[]);
    setLoading(false);
  }, [activeClass]);

  useEffect(() => {
    if (activeClass) {
      setLoading(true);
      loadTests();
    }
  }, [activeClass, loadTests]);

  // Monitoring aktif saat siswa sedang mengerjakan test
  useExamMonitoring(activeTest !== null, activeClass?.id ?? null);

  // Track violation count
  useEffect(() => {
    if (!activeTest) return;
    const handleVisibility = () => {
      if (document.hidden) setViolationCount((c) => c + 1);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeTest]);

  const startTest = (test: Test) => {
    setActiveTest(test);
    setAnswers(new Array(test.questions.length).fill(-1));
    setCurrentQ(0);
    setResult(null);
    setViolationCount(0);
  };

  const selectAnswer = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === qIdx ? optIdx : a)));
  };

  const submitTest = async () => {
    if (!activeTest || !profile) return;
    setSubmitting(true);

    // Hitung skor
    let score = 0;
    activeTest.questions.forEach((q, i) => {
      if (answers[i] === q.correct_index) score++;
    });
    const total = activeTest.questions.length;
    const finalScore = total > 0 ? Math.round((score / total) * 100) : 0;

    // Simpan submission
    const { error } = await supabase.from('submissions').insert({
      test_id: activeTest.id,
      student_id: profile.id,
      answers,
      score: finalScore,
    });

    if (!error) {
      setResult({ score: finalScore, total });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // Test in progress
  if (activeTest && !result) {
    const question = activeTest.questions[currentQ];
    const totalQ = activeTest.questions.length;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeTest.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Soal {currentQ + 1} dari {totalQ}
            </p>
          </div>
          {violationCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-900/20 dark:text-error-400">
              <AlertTriangle className="h-4 w-4" />
              {violationCount}x pelanggaran
            </div>
          )}
        </div>

        {/* Monitoring warning */}
        <div className="flex items-center gap-2 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Monitoring aktif. Jangan berpindah tab atau meminimalkan jendela —
            aktivitas akan tercatat.
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
          />
        </div>

        {/* Question */}
        {question ? (
          <div className="card p-6">
            <p className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              {question.question}
            </p>
            <div className="space-y-2">
              {question.options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => selectAnswer(currentQ, optIdx)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                    answers[currentQ] === optIdx
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      answers[currentQ] === optIdx
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {answers[currentQ] === optIdx && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Soal belum tersedia. Hubungi guru Anda.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            className="btn-secondary"
          >
            Sebelumnya
          </button>
          {currentQ < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQ((q) => Math.min(totalQ - 1, q + 1))}
              className="btn-primary"
            >
              Berikutnya <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={submitting || answers.includes(-1)}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengumpulkan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Kumpulkan Jawaban
                </>
              )}
            </button>
          )}
        </div>

        {/* Question navigator */}
        <div className="flex flex-wrap gap-2">
          {activeTest.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                i === currentQ
                  ? 'bg-primary-600 text-white'
                  : answers[i] !== -1
                  ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    const passed = result.score >= 75;
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            passed
              ? 'bg-success-100 dark:bg-success-900/30'
              : 'bg-warning-100 dark:bg-warning-900/30'
          }`}
        >
          {passed ? (
            <CheckCircle2 className="h-10 w-10 text-success-600 dark:text-success-400" />
          ) : (
            <AlertTriangle className="h-10 w-10 text-warning-600 dark:text-warning-400" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Test Selesai
          </h1>
          <p className="mt-2 text-4xl font-bold text-primary-600 dark:text-primary-400">
            {result.score}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            dari 100 poin
          </p>
          {violationCount > 0 && (
            <p className="mt-2 text-sm text-error-500">
              Terdeteksi {violationCount} pelanggaran monitoring
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setActiveTest(null);
            setResult(null);
          }}
          className="btn-primary w-full"
        >
          Kembali ke Daftar Test
        </button>
      </div>
    );
  }

  // Test list
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ujian & Test</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kerjakan pretest dan posttest yang tersedia
        </p>
      </div>

      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <FileQuestion className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Belum ada test
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Guru belum membuat test untuk kelas ini
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => {
            const meta = testTypeMeta[test.type];
            const Icon = meta.icon;
            const color = meta.color;
            return (
              <div key={test.id} className="card p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}>
                  <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                  {test.title}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full bg-${color}-100 px-2.5 py-1 text-xs font-medium text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-400`}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {test.questions.length} soal
                  </span>
                </div>
                <button
                  onClick={() => startTest(test)}
                  disabled={test.questions.length === 0}
                  className="btn-primary mt-4 w-full text-sm disabled:opacity-50"
                >
                  {test.questions.length === 0 ? 'Soal belum tersedia' : 'Mulai Test'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
