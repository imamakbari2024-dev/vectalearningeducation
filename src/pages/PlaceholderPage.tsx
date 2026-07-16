import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description ?? 'Modul ini akan dikembangkan pada fase berikutnya.'}
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Construction className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Segera Hadir
        </h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Fungsionalitas penuh untuk modul ini akan diimplementasikan pada fase
          pengembangan berikutnya.
        </p>
      </div>
    </div>
  );
}
