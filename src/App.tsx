import { useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import GuruDashboard from './pages/guru/GuruDashboard';
import GuruKelasPage from './pages/guru/GuruKelasPage';
import GuruSiswaDetail from './pages/guru/GuruSiswaDetail';
import GuruUploadPage from './pages/guru/GuruUploadPage';
import GuruAlurPage from './pages/guru/GuruAlurPage';
import GuruBankSoalPage from './pages/guru/GuruBankSoalPage';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import SiswaMateriPage from './pages/siswa/SiswaMateriPage';
import SiswaAlurPage from './pages/siswa/SiswaAlurPage';
import SiswaUjianPage from './pages/siswa/SiswaUjianPage';
import PlaceholderPage from './pages/PlaceholderPage';
import NoClassWarning from './components/NoClassWarning';

// Lazy-load heavy pages (Three.js + Gemini SDK)
const Siswa3DViewerPage = lazy(() => import('./pages/siswa/Siswa3DViewerPage'));
const VectaAIPage = lazy(() => import('./pages/VectaAIPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  );
}

// Inisialisasi tema dari store saat app pertama kali dimuat
function ThemeInit() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Arahkan ke dashboard yang sesuai berdasarkan peran
  const isGuruRoute = location.pathname.startsWith('/guru');
  const isSiswaRoute = location.pathname.startsWith('/siswa');

  if (profile.role === 'guru' && isSiswaRoute) {
    return <Navigate to="/guru" replace />;
  }
  if (profile.role === 'siswa' && isGuruRoute) {
    return <Navigate to="/siswa" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Pembungkus untuk halaman yang memerlukan kelas aktif
function RequiresClass({ children }: { children: React.ReactNode }) {
  const activeClassId = useAppStore((s) => s.activeClassId);
  if (!activeClassId) {
    return (
      <AppLayout>
        <NoClassWarning />
      </AppLayout>
    );
  }
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function RootRedirect() {
  const profile = useAppStore((s) => s.profile);
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/auth" replace />;
  return <Navigate to={profile.role === 'guru' ? '/guru' : '/siswa'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Guru routes */}
      <Route
        path="/guru"
        element={
          <ProtectedRoute>
            <GuruDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guru/kelas"
        element={
          <ProtectedRoute>
            <GuruKelasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guru/upload"
        element={
          <RequiresClass>
            <GuruUploadPage />
          </RequiresClass>
        }
      />
      <Route
        path="/guru/alur"
        element={
          <RequiresClass>
            <GuruAlurPage />
          </RequiresClass>
        }
      />
      <Route
        path="/guru/bank-soal"
        element={
          <RequiresClass>
            <GuruBankSoalPage />
          </RequiresClass>
        }
      />
      <Route
        path="/guru/analisis"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Analisis Hasil"
              description="Pantau performa siswa di seluruh kelas."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guru/vecta-ai"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <VectaAIPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/guru/pengaturan"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Pengaturan"
              description="Kelola profil dan preferensi akun Anda."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guru/siswa/:id"
        element={
          <ProtectedRoute>
            <GuruSiswaDetail />
          </ProtectedRoute>
        }
      />

      {/* Siswa routes */}
      <Route
        path="/siswa"
        element={
          <ProtectedRoute>
            <SiswaDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/materi"
        element={
          <ProtectedRoute>
            <SiswaMateriPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/alur"
        element={
          <ProtectedRoute>
            <SiswaAlurPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/ujian"
        element={
          <ProtectedRoute>
            <SiswaUjianPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/ai"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <VectaAIPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/3d-viewer"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Siswa3DViewerPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/analisis"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Analisis Hasil"
              description="Pantau progres dan nilai Anda."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siswa/profil"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Profil"
              description="Kelola informasi profil Anda."
            />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeInit />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
