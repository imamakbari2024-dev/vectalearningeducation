import { AlertTriangle } from 'lucide-react';

export default function NoClassWarning() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-warning-300 bg-warning-50 p-12 text-center dark:border-warning-700 dark:bg-warning-900/10">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30">
        <AlertTriangle className="h-7 w-7 text-warning-600 dark:text-warning-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Silakan pilih kelas terlebih dahulu
      </h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Modul ini memerlukan kelas aktif. Pilih kelas dari dropdown di atas atau
        buat/kelas dari menu sidebar.
      </p>
    </div>
  );
}
