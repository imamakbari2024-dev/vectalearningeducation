import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'guru' | 'siswa'>('siswa');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/');
      }
    } else {
      if (fullName.trim().length < 2) {
        setError('Nama lengkap minimal 2 karakter');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName.trim(), role);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vecta Learning
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform LMS dengan Spatial Computing & AI Socratic
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {/* Tab switch */}
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-900 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-900 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Peran
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('guru')}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        role === 'guru'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <GraduationCap
                        className={`h-6 w-6 ${
                          role === 'guru' ? 'text-primary-600' : 'text-gray-400'
                        }`}
                      />
                      <span className="text-sm font-medium">Guru</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('siswa')}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        role === 'siswa'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <BookOpen
                        className={`h-6 w-6 ${
                          role === 'siswa' ? 'text-primary-600' : 'text-gray-400'
                        }`}
                      />
                      <span className="text-sm font-medium">Siswa</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-900/20 dark:text-error-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : mode === 'login' ? (
                'Masuk'
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          © 2026 Vecta Learning. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
