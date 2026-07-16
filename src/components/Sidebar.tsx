import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  GitBranch,
  FileQuestion,
  BarChart3,
  Bot,
  Settings,
  GraduationCap,
  BookOpen,
  LogOut,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const guruNav = [
  { to: '/guru', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/guru/kelas', label: 'Kelas Saya', icon: FolderOpen },
  { to: '/guru/upload', label: 'Upload Materi', icon: Upload },
  { to: '/guru/alur', label: 'Alur Belajar', icon: GitBranch },
  { to: '/guru/bank-soal', label: 'Bank Soal', icon: FileQuestion },
  { to: '/guru/analisis', label: 'Analisis Hasil', icon: BarChart3 },
  { to: '/guru/vecta-ai', label: 'Vecta AI', icon: Bot },
  { to: '/guru/pengaturan', label: 'Pengaturan', icon: Settings },
];

const siswaNav = [
  { to: '/siswa', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/siswa/materi', label: 'Akses Materi', icon: BookOpen },
  { to: '/siswa/alur', label: 'Mengikuti Alur', icon: GitBranch },
  { to: '/siswa/ujian', label: 'Ujian & Test', icon: FileQuestion },
  { to: 'inde.html', label: 'Bertanya ke AI', icon: Bot },
  { to: '/siswa/analisis', label: 'Analisis Hasil', icon: BarChart3 },
  { to: '/siswa/profil', label: 'Profil', icon: Settings },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const profile = useAppStore((s) => s.profile);
  const focusMode = useAppStore((s) => s.focusMode);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (focusMode) return null;

  const navItems = profile?.role === 'guru' ? guruNav : siswaNav;
  const roleLabel = profile?.role === 'guru' ? 'Guru' : 'Siswa';
  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                Vecta
              </span>
              <span className="ml-1 text-base font-bold text-primary-600 dark:text-primary-400">
                Learning
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Profile card */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {profile?.full_name ?? 'Pengguna'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {roleLabel}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20"
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
