import { useEffect, useState, useCallback } from 'react';
import {
  GitBranch,
  Plus,
  X,
  Loader2,
  Trash2,
  Lock,
  Unlock,
  GripVertical,
  FileText,
  Box,
  FileQuestion,
  ClipboardCheck,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  supabase,
  type LearningPath,
  type LearningPathStep,
  type Material,
  type Test,
} from '../../lib/supabase';

const STEP_TYPES = [
  { value: 'pretest', label: 'Pretest', icon: ClipboardCheck, color: 'warning' },
  { value: 'material', label: 'Materi', icon: FileText, color: 'primary' },
  { value: 'explore3d', label: 'Eksplorasi 3D', icon: Box, color: 'accent' },
  { value: 'posttest', label: 'Posttest', icon: FileQuestion, color: 'success' },
] as const;

function stepIcon(type: string) {
  return STEP_TYPES.find((s) => s.value === type)?.icon ?? FileText;
}
function stepColor(type: string) {
  return STEP_TYPES.find((s) => s.value === type)?.color ?? 'primary';
}

export default function GuruAlurPage() {
  const activeClass = useAppStore((s) => s.activeClass);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [steps, setSteps] = useState<LearningPathStep[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePath, setShowCreatePath] = useState(false);
  const [newPathTitle, setNewPathTitle] = useState('');
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({
    step_type: 'material' as LearningPathStep['step_type'],
    title: '',
    material_id: '',
  });

  const loadData = useCallback(async () => {
    if (!activeClass) return;
    const [{ data: pathsData }, { data: matData }, { data: testData }] = await Promise.all([
      supabase.from('learning_paths').select('*').eq('class_id', activeClass.id).order('order_index'),
      supabase.from('materials').select('*').eq('class_id', activeClass.id).order('order_index'),
      supabase.from('tests').select('*').eq('class_id', activeClass.id).order('created_at'),
    ]);
    setPaths((pathsData ?? []) as LearningPath[]);
    setMaterials((matData ?? []) as Material[]);
    setTests((testData ?? []) as Test[]);
    if (pathsData && pathsData.length > 0) {
      setSelectedPath(pathsData[0] as LearningPath);
    }
    setLoading(false);
  }, [activeClass]);

  useEffect(() => {
    if (activeClass) {
      setLoading(true);
      loadData();
    }
  }, [activeClass, loadData]);

  // Load steps when selected path changes
  useEffect(() => {
    if (!selectedPath) {
      setSteps([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('learning_path_steps')
        .select('*')
        .eq('path_id', selectedPath.id)
        .order('order_index');
      setSteps((data ?? []) as LearningPathStep[]);
    })();
  }, [selectedPath]);

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || newPathTitle.trim().length < 2) return;
    const { data, error } = await supabase
      .from('learning_paths')
      .insert({
        class_id: activeClass.id,
        title: newPathTitle.trim(),
        order_index: paths.length,
      })
      .select()
      .single();
    if (!error && data) {
      const newPath = data as LearningPath;
      setPaths((prev) => [...prev, newPath]);
      setSelectedPath(newPath);
      setNewPathTitle('');
      setShowCreatePath(false);
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPath || newStep.title.trim().length < 2) return;
    const { data, error } = await supabase
      .from('learning_path_steps')
      .insert({
        path_id: selectedPath.id,
        step_type: newStep.step_type,
        title: newStep.title.trim(),
        material_id: newStep.material_id || null,
        order_index: steps.length,
        is_locked: true,
      })
      .select()
      .single();
    if (!error && data) {
      setSteps((prev) => [...prev, data as LearningPathStep]);
      setNewStep({ step_type: 'material', title: '', material_id: '' });
      setShowAddStep(false);
    }
  };

  const toggleLock = async (step: LearningPathStep) => {
    const { error } = await supabase
      .from('learning_path_steps')
      .update({ is_locked: !step.is_locked })
      .eq('id', step.id);
    if (!error) {
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, is_locked: !s.is_locked } : s))
      );
    }
  };

  const deleteStep = async (stepId: string) => {
    if (!confirm('Hapus langkah ini dari alur?')) return;
    await supabase.from('learning_path_steps').delete().eq('id', stepId);
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const deletePath = async (pathId: string) => {
    if (!confirm('Hapus alur belajar ini? Semua langkah akan terhapus.')) return;
    await supabase.from('learning_paths').delete().eq('id', pathId);
    const remaining = paths.filter((p) => p.id !== pathId);
    setPaths(remaining);
    setSelectedPath(remaining[0] ?? null);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alur Belajar</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Susun urutan: Pretest → Materi → Eksplorasi 3D → Posttest
          </p>
        </div>
        <button onClick={() => setShowCreatePath(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Buat Alur Baru
        </button>
      </div>

      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <GitBranch className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Belum ada alur belajar
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Buat alur pertama untuk menentukan urutan pembelajaran siswa
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Path list */}
          <div className="space-y-2">
            {paths.map((path) => (
              <button
                key={path.id}
                onClick={() => setSelectedPath(path)}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                  selectedPath?.id === path.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-primary-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {path.title}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePath(path.id);
                  }}
                  className="rounded p-1 text-gray-400 hover:text-error-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>

          {/* Steps for selected path */}
          <div className="lg:col-span-2">
            {selectedPath && (
              <div className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Langkah: {selectedPath.title}
                  </h2>
                  <button onClick={() => setShowAddStep(true)} className="btn-secondary text-sm">
                    <Plus className="h-4 w-4" />
                    Tambah Langkah
                  </button>
                </div>

                {steps.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Belum ada langkah. Tambahkan langkah pertama.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {steps.map((step, idx) => {
                      const Icon = stepIcon(step.step_type);
                      const color = stepColor(step.step_type);
                      return (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                        >
                          <div className="flex flex-col items-center">
                            <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                            <span className="text-xs font-bold text-gray-400">
                              {idx + 1}
                            </span>
                          </div>
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}
                          >
                            <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {step.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {STEP_TYPES.find((s) => s.value === step.step_type)?.label}
                              {step.material_id &&
                                ` · ${materials.find((m) => m.id === step.material_id)?.title ?? 'Materi'}`}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleLock(step)}
                            className={`rounded-lg p-2 transition-colors ${
                              step.is_locked
                                ? 'text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-900/20'
                                : 'text-success-500 hover:bg-success-50 dark:hover:bg-success-900/20'
                            }`}
                            title={step.is_locked ? 'Kunci langkah' : 'Buka kunci langkah'}
                          >
                            {step.is_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => deleteStep(step.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create path modal */}
      {showCreatePath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreatePath(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Buat Alur Baru</h2>
              <button onClick={() => setShowCreatePath(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePath} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Judul Alur
                </label>
                <input
                  type="text"
                  value={newPathTitle}
                  onChange={(e) => setNewPathTitle(e.target.value)}
                  placeholder="contoh: Bab 1 — Geometri Ruang"
                  className="input-field"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                <Plus className="h-4 w-4" />
                Buat Alur
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add step modal */}
      {showAddStep && selectedPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddStep(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tambah Langkah</h2>
              <button onClick={() => setShowAddStep(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStep} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipe Langkah
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STEP_TYPES.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setNewStep((s) => ({ ...s, step_type: st.value }))}
                      className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all ${
                        newStep.step_type === st.value
                          ? `border-${st.color}-500 bg-${st.color}-50 dark:bg-${st.color}-900/20`
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <st.icon className="h-4 w-4" />
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Judul Langkah
                </label>
                <input
                  type="text"
                  value={newStep.title}
                  onChange={(e) => setNewStep((s) => ({ ...s, title: e.target.value }))}
                  placeholder="contoh: Pretest Geometri"
                  className="input-field"
                  required
                />
              </div>
              {(newStep.step_type === 'material' || newStep.step_type === 'explore3d') && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Materi
                  </label>
                  <select
                    value={newStep.material_id}
                    onChange={(e) => setNewStep((s) => ({ ...s, material_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">— Tidak terikat materi —</option>
                    {materials
                      .filter((m) =>
                        newStep.step_type === 'explore3d' ? m.type === 'model3d' : true
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} ({m.type})
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {(newStep.step_type === 'pretest' || newStep.step_type === 'posttest') && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Test
                  </label>
                  <select
                    value={newStep.material_id}
                    onChange={(e) => setNewStep((s) => ({ ...s, material_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">— Tidak terikat test —</option>
                    {tests
                      .filter((t) => t.type === newStep.step_type)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <button type="submit" className="btn-primary w-full">
                <Plus className="h-4 w-4" />
                Tambah Langkah
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
