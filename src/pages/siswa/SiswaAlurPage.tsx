import { useEffect, useState, useCallback } from 'react';
import {
  GitBranch,
  Loader2,
  Lock,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Box,
  ClipboardCheck,
  FileQuestion,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  supabase,
  type LearningPath,
  type LearningPathStep,
  type StepProgress,
  type Material,
} from '../../lib/supabase';
import FocusWidget from '../../components/FocusWidget';

const STEP_META = {
  pretest: { label: 'Pretest', icon: ClipboardCheck, color: 'warning' },
  material: { label: 'Materi', icon: FileText, color: 'primary' },
  explore3d: { label: 'Eksplorasi 3D', icon: Box, color: 'accent' },
  posttest: { label: 'Posttest', icon: FileQuestion, color: 'success' },
} as const;

export default function SiswaAlurPage() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [allSteps, setAllSteps] = useState<Record<string, LearningPathStep[]>>({});
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [activeStep, setActiveStep] = useState<LearningPathStep | null>(null);

  const loadData = useCallback(async () => {
    if (!activeClass || !profile) return;

    const [{ data: pathsData }, { data: matData }] = await Promise.all([
      supabase.from('learning_paths').select('*').eq('class_id', activeClass.id).order('order_index'),
      supabase.from('materials').select('*').eq('class_id', activeClass.id).order('order_index'),
    ]);
    const pathsList = (pathsData ?? []) as LearningPath[];
    setPaths(pathsList);
    setMaterials((matData ?? []) as Material[]);

    // Load steps for each path
    const stepsMap: Record<string, LearningPathStep[]> = {};
    for (const path of pathsList) {
      const { data: stepsData } = await supabase
        .from('learning_path_steps')
        .select('*')
        .eq('path_id', path.id)
        .order('order_index');
      stepsMap[path.id] = (stepsData ?? []) as LearningPathStep[];
    }
    setAllSteps(stepsMap);

    // Load progress
    const { data: progData } = await supabase
      .from('step_progress')
      .select('*')
      .eq('student_id', profile.id);
    const progMap: Record<string, string> = {};
    for (const p of (progData ?? []) as StepProgress[]) {
      progMap[p.step_id] = p.status;
    }
    setProgress(progMap);

    if (pathsList.length > 0) setSelectedPath(pathsList[0]);
    setLoading(false);
  }, [activeClass, profile]);

  useEffect(() => {
    if (activeClass) {
      setLoading(true);
      loadData();
    }
  }, [activeClass, loadData]);

  const startStep = async (step: LearningPathStep) => {
    if (!profile) return;
    // Cek apakah langkah sebelumnya sudah selesai (sequencing lock)
    if (selectedPath) {
      const steps = allSteps[selectedPath.id] ?? [];
      const stepIdx = steps.findIndex((s) => s.id === step.id);
      if (stepIdx > 0) {
        const prevStep = steps[stepIdx - 1];
        const prevStatus = progress[prevStep.id];
        if (prevStatus !== 'completed' && !prevStep.is_locked === false) {
          // Langkah sebelumnya belum selesai
          return;
        }
      }
    }

    // Set step sebagai in_progress
    setActiveStep(step);
    const { data: existing } = await supabase
      .from('step_progress')
      .select('*')
      .eq('student_id', profile.id)
      .eq('step_id', step.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('step_progress').insert({
        student_id: profile.id,
        step_id: step.id,
        status: 'in_progress',
      });
      setProgress((prev) => ({ ...prev, [step.id]: 'in_progress' }));
    }
  };

  const completeStep = async (step: LearningPathStep) => {
    if (!profile) return;
    await supabase
      .from('step_progress')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('student_id', profile.id)
      .eq('step_id', step.id);
    setProgress((prev) => ({ ...prev, [step.id]: 'completed' }));
    setActiveStep(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (paths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
        <GitBranch className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Belum ada alur belajar
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Guru belum membuat alur belajar untuk kelas ini
        </p>
      </div>
    );
  }

  const steps = selectedPath ? allSteps[selectedPath.id] ?? [] : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mengikuti Alur</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Selesaikan setiap langkah secara berurutan untuk membuka langkah berikutnya
          </p>
        </div>

        {/* Path selector */}
        {paths.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {paths.map((path) => (
              <button
                key={path.id}
                onClick={() => setSelectedPath(path)}
                className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  selectedPath?.id === path.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {path.title}
              </button>
            ))}
          </div>
        )}

        {/* Steps timeline */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {selectedPath?.title}
          </h2>
          {steps.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada langkah di alur ini
            </p>
          ) : (
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const meta = STEP_META[step.step_type];
                const Icon = meta.icon;
                const status = progress[step.id] ?? 'locked';
                const isLocked = step.is_locked && status !== 'completed' && status !== 'in_progress';
                const isCompleted = status === 'completed';
                const isActive = activeStep?.id === step.id;

                // Cek apakah langkah sebelumnya sudah selesai
                const prevStep = idx > 0 ? steps[idx - 1] : null;
                const prevCompleted = !prevStep || progress[prevStep.id] === 'completed';
                const canAccess = !isLocked && (idx === 0 || prevCompleted);

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
                      isActive
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : isCompleted
                        ? 'border-success-200 bg-success-50/50 dark:border-success-800 dark:bg-success-900/10'
                        : isLocked
                        ? 'border-gray-200 opacity-60 dark:border-gray-800'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {/* Status indicator */}
                    <div className="flex flex-col items-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-success-500" />
                      ) : isLocked ? (
                        <Lock className="h-6 w-6 text-gray-400" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                      )}
                      {idx < steps.length - 1 && (
                        <div className="mt-1 h-6 w-0.5 bg-gray-200 dark:bg-gray-700" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${meta.color}-100 dark:bg-${meta.color}-900/30`}>
                      <Icon className={`h-5 w-5 text-${meta.color}-600 dark:text-${meta.color}-400`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {meta.label} · Langkah {idx + 1}
                        {step.material_id &&
                          ` · ${materials.find((m) => m.id === step.material_id)?.title ?? ''}`}
                      </p>
                    </div>

                    {/* Action */}
                    {isCompleted ? (
                      <span className="text-xs font-medium text-success-600 dark:text-success-400">
                        Selesai
                      </span>
                    ) : isLocked ? (
                      <span className="text-xs text-gray-400">Terkunci</span>
                    ) : canAccess ? (
                      <button
                        onClick={() => startStep(step)}
                        className="btn-primary text-sm"
                      >
                        {isActive ? (
                          <>
                            Lanjut <ArrowRight className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" /> Mulai
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Selesaikan langkah sebelumnya</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active step content */}
        {activeStep && (
          <div className="card p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {activeStep.title}
            </h3>
            {activeStep.step_type === 'material' && activeStep.material_id && (
              <MaterialView materialId={activeStep.material_id} materials={materials} />
            )}
            {activeStep.step_type === 'explore3d' && activeStep.material_id && (
              <div>
                <div className="rounded-lg border-2 border-dashed border-accent-200 p-6 text-center dark:border-accent-800">
                  <Box className="mx-auto mb-2 h-10 w-10 text-accent-400" />
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    Buka model 3D di viewer interaktif dengan hand tracking
                  </p>
                  <a href="/siswa/3d-viewer" className="btn-primary inline-flex">
                    <Box className="h-4 w-4" />
                    Buka Viewer 3D
                  </a>
                </div>
              </div>
            )}
            {(activeStep.step_type === 'pretest' || activeStep.step_type === 'posttest') && (
              <div className="rounded-lg border-2 border-dashed border-warning-200 p-6 text-center dark:border-warning-800">
                <ClipboardCheck className="mx-auto mb-2 h-10 w-10 text-warning-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Test akan dimulai di halaman Ujian & Test
                </p>
              </div>
            )}
            <button
              onClick={() => completeStep(activeStep)}
              className="btn-primary mt-4 w-full"
            >
              <CheckCircle2 className="h-4 w-4" />
              Tandai Selesai & Lanjut
            </button>
          </div>
        )}
      </div>

      {/* Sidebar — Focus Widget */}
      <div className="lg:col-span-1">
        <FocusWidget />
      </div>
    </div>
  );
}

function MaterialView({
  materialId,
  materials,
}: {
  materialId: string;
  materials: Material[];
}) {
  const material = materials.find((m) => m.id === materialId);
  if (!material) {
    return <p className="text-sm text-gray-500">Materi tidak ditemukan</p>;
  }

  if (material.type === 'pdf') {
    return (
      <iframe
        src={material.file_url}
        className="h-[500px] w-full rounded-lg border border-gray-200 dark:border-gray-800"
        title={material.title}
      />
    );
  }

  if (material.type === 'video') {
    return (
      <video
        src={material.file_url}
        controls
        className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
      />
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-accent-200 p-6 text-center dark:border-accent-800">
      <Box className="mx-auto mb-2 h-10 w-10 text-accent-400" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Model 3D akan ditampilkan di sini (Fase 4)
      </p>
    </div>
  );
}
