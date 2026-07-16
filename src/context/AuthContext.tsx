import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

interface AuthContextValue {
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'guru' | 'siswa'
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setProfile = useAppStore((s) => s.setProfile);

  useEffect(() => {
    // Ambil sesi awal
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) setProfile(data as Profile);
      }
      setLoading(false);
    })();

    // Listener perubahan auth — bungkus async di IIFE untuk hindari deadlock
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) setProfile(data as Profile);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, [setProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'guru' | 'siswa'
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
}
