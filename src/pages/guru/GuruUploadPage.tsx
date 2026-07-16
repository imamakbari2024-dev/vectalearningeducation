import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Video,
  Box,
  X,
  Loader2,
  Trash2,
  FileUp,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { supabase, type Material } from '../../lib/supabase';

function detectFileType(file: File): 'pdf' | 'video' | 'model3d' | null {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/.test(name)) return 'video';
  if (
    file.type === 'model/gltf-binary' ||
    file.type === 'model/gltf+json' ||
    name.endsWith('.glb') ||
    name.endsWith('.gltf')
  )
    return 'model3d';
  return null;
}

function fileIcon(type: Material['type']) {
  if (type === 'pdf') return FileText;
  if (type === 'video') return Video;
  return Box;
}

export default function GuruUploadPage() {
  const profile = useAppStore((s) => s.profile);
  const activeClass = useAppStore((s) => s.activeClass);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<UploadJob[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [detailForm, setDetailForm] = useState({ title: '', description: '', text_content: '' });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface UploadJob {
    id: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'done' | 'error';
    error?: string;
  }

  const loadMaterials = useCallback(async () => {
    if (!activeClass) return;
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('class_id', activeClass.id)
      .order('order_index', { ascending: true });
    setMaterials((data ?? []) as Material[]);
    setLoading(false);
  }, [activeClass]);

  useEffect(() => {
    if (activeClass) {
      setLoading(true);
      loadMaterials();
    }
  }, [activeClass, loadMaterials]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const type = detectFileType(file);
    if (!type) {
      alert('Format file tidak didukung. Gunakan PDF, Video (mp4/webm), atau 3D (.glb/.gltf).');
      return;
    }
    setPendingFile(file);
    setDetailForm({
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      text_content: '',
    });
    setShowDetails(true);
  };

  const handleUpload = async () => {
    if (!pendingFile || !activeClass || !profile) return;
    const type = detectFileType(pendingFile);
    if (!type) return;

    setShowDetails(false);
    const jobId = crypto.randomUUID();
    setUploading((prev) => [
      ...prev,
      { id: jobId, fileName: pendingFile.name, progress: 0, status: 'uploading' },
    ]);

    const filePath = `${activeClass.id}/${jobId}-${pendingFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, pendingFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      setUploading((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: 'error', error: uploadError.message } : j
        )
      );
      return;
    }

    const { data: urlData } = supabase.storage.from('materials').getPublicUrl(filePath);

    const { error: dbError } = await supabase.from('materials').insert({
      class_id: activeClass.id,
      title: detailForm.title.trim() || pendingFile.name,
      description: detailForm.description.trim() || null,
      type,
      file_url: urlData.publicUrl,
      file_name: pendingFile.name,
      text_content: detailForm.text_content.trim() || null,
      order_index: materials.length,
    });

    if (dbError) {
      setUploading((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'error', error: dbError.message } : j))
      );
      return;
    }

    setUploading((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'done', progress: 100 } : j))
    );
    setPendingFile(null);
    setDetailForm({ title: '', description: '', text_content: '' });
    await loadMaterials();

    setTimeout(() => {
      setUploading((prev) => prev.filter((j) => j.id !== jobId));
    }, 3000);
  };

  const handleDelete = async (mat: Material) => {
    if (!confirm(`Hapus materi "${mat.title}"?`)) return;
    // Hapus dari storage
    const path = mat.file_url.split('/materials/')[1];
    if (path) {
      await supabase.storage.from('materials').remove([path]);
    }
    await supabase.from('materials').delete().eq('id', mat.id);
    setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Materi</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Unggah PDF, Video, dan model 3D (.glb/.gltf) untuk kelas{' '}
          <span className="font-medium text-primary-600 dark:text-primary-400">
            {activeClass?.name}
          </span>
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 hover:border-primary-400 dark:border-gray-700 dark:hover:border-primary-500'
        }`}
      >
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <FileUp className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Seret file ke sini atau klik untuk memilih
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          PDF, Video (MP4/WebM), atau 3D (.glb/.gltf) — maks 50MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.mp4,.webm,.ogg,.mov,.glb,.gltf,video/*,application/pdf,model/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              {job.status === 'uploading' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              )}
              {job.status === 'done' && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
                  <svg className="h-3 w-3 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {job.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-error-500" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {job.fileName}
                </p>
                {job.status === 'uploading' && (
                  <p className="text-xs text-gray-500">Mengunggah...</p>
                )}
                {job.status === 'done' && (
                  <p className="text-xs text-success-600 dark:text-success-400">Berhasil diunggah</p>
                )}
                {job.status === 'error' && (
                  <p className="text-xs text-error-500">{job.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Materials list */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Materi di Kelas Ini
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
            <Upload className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada materi diunggah
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((mat) => {
              const Icon = fileIcon(mat.type);
              return (
                <div
                  key={mat.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        mat.type === 'pdf'
                          ? 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'
                          : mat.type === 'video'
                          ? 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400'
                          : 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mat.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {mat.type === 'pdf' ? 'PDF' : mat.type === 'video' ? 'Video' : 'Model 3D'}
                        {mat.description ? ` · ${mat.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(mat)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {showDetails && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetails(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detail Materi
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <FileUp className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {pendingFile.name}
                </span>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Judul Materi
                </label>
                <input
                  type="text"
                  value={detailForm.title}
                  onChange={(e) => setDetailForm((f) => ({ ...f, title: e.target.value }))}
                  className="input-field"
                  placeholder="Judul materi"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deskripsi (opsional)
                </label>
                <input
                  type="text"
                  value={detailForm.description}
                  onChange={(e) => setDetailForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field"
                  placeholder="Deskripsi singkat"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teks Materi untuk AI (opsional)
                </label>
                <textarea
                  value={detailForm.text_content}
                  onChange={(e) => setDetailForm((f) => ({ ...f, text_content: e.target.value }))}
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Tempel teks materi di sini agar Vecta AI bisa menjawab pertanyaan siswa berdasarkan konten ini (RAG)"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Teks ini akan digunakan sebagai konteks RAG oleh Vecta AI
                </p>
              </div>
              <button onClick={handleUpload} className="btn-primary w-full">
                <Upload className="h-4 w-4" />
                Unggah Materi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
