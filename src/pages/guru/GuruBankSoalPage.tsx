import { useEffect, useState, useCallback } from 'react';
import {
  FileQuestion,
  Plus,
  X,
  Loader2,
  Trash2,
  ClipboardCheck,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { supabase, type Test, type TestQuestion } from '../../lib/supabase';

export default function GuruBankSoalPage() {
  const activeClass = useAppStore((s) => s.activeClass);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'pretest' as Test['type'],
  });
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([
    { question: '', options: ['', '', '', ''], correct_index: 0 },
  ]);

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

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || createForm.title.trim().length < 2) return;
    const { data, error } = await supabase
      .from('tests')
      .insert({
        class_id: activeClass.id,
        title: createForm.title.trim(),
        type: createForm.type,
        questions: [],
      })
      .select()
      .single();
    if (!error && data) {
      setTests((prev) => [data as Test, ...prev]);
      setCreateForm({ title: '', type: 'pretest' });
      setShowCreate(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Hapus test ini? Semua jawaban siswa juga akan terhapus.')) return;
    await supabase.from('tests').delete().eq('id', testId);
    setTests((prev) => prev.filter((t) => t.id !== testId));
  };

  const openEditor = (test: Test) => {
    setEditingTest(test);
    setQuestions(
      test.questions.length > 0
        ? test.questions
        : [{ question: '', options: ['', '', '', ''], correct_index: 0 }]
    );
  };

  const saveQuestions = async () => {
    if (!editingTest) return;
    const { error } = await supabase
      .from('tests')
      .update({ questions })
      .eq('id', editingTest.id);
    if (!error) {
      setTests((prev) =>
        prev.map((t) => (t.id === editingTest.id ? { ...t, questions } : t))
      );
      setEditingTest(null);
    }
  };

  const updateQuestion = (idx: number, field: keyof TestQuestion, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, oi) => (oi === optIdx ? value : o)) }
          : q
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question: '', options: ['', '', '', ''], correct_index: 0 },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const testTypeIcon = (type: Test['type']) => {
    if (type === 'pretest') return ClipboardCheck;
    if (type === 'posttest') return FileCheck;
    return HelpCircle;
  };

  const testTypeColor = (type: Test['type']) => {
    if (type === 'pretest') return 'warning';
    if (type === 'posttest') return 'success';
    return 'primary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Buat dan kelola soal pretest, posttest, dan quiz
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Buat Test Baru
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <FileQuestion className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Belum ada test
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Buat test pertama untuk kelas ini
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => {
            const Icon = testTypeIcon(test.type);
            const color = testTypeColor(test.type);
            return (
              <div key={test.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}>
                    <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
                  </div>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                  {test.title}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full bg-${color}-100 px-2.5 py-1 text-xs font-medium text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-400`}>
                    {test.type === 'pretest' ? 'Pretest' : test.type === 'posttest' ? 'Posttest' : 'Quiz'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {test.questions.length} soal
                  </span>
                </div>
                <button
                  onClick={() => openEditor(test)}
                  className="btn-secondary mt-4 w-full text-sm"
                >
                  Edit Soal
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create test modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Buat Test Baru</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Judul Test
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="contoh: Pretest Bab 1"
                  className="input-field"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipe Test
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pretest', 'posttest', 'quiz'] as const).map((t) => {
                    const Icon = testTypeIcon(t);
                    const color = testTypeColor(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCreateForm((f) => ({ ...f, type: t }))}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm transition-all ${
                          createForm.type === t
                            ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {t === 'pretest' ? 'Pretest' : t === 'posttest' ? 'Posttest' : 'Quiz'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                <Plus className="h-4 w-4" />
                Buat Test
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Question editor modal */}
      {editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingTest(null)} />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Soal — {editingTest.title}
              </h2>
              <button onClick={() => setEditingTest(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Soal {qIdx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(qIdx)}
                        className="rounded p-1 text-gray-400 hover:text-error-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                    placeholder="Tulis pertanyaan di sini..."
                    className="input-field mb-3"
                  />
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    Pilih jawaban benar dengan mengklik lingkaran
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIdx, 'correct_index', optIdx)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            q.correct_index === optIdx
                              ? 'border-success-500 bg-success-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {q.correct_index === optIdx && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Opsi ${optIdx + 1}`}
                          className="input-field"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={addQuestion} className="btn-secondary flex-1">
                <Plus className="h-4 w-4" />
                Tambah Soal
              </button>
              <button onClick={saveQuestions} className="btn-primary flex-1">
                Simpan Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
