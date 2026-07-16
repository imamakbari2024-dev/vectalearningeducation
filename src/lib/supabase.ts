import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Tipe data aplikasi
export type UserRole = 'guru' | 'siswa';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  class_code: string;
  teacher_id: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Material {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  type: 'pdf' | 'video' | 'model3d';
  file_url: string;
  file_name: string;
  text_content: string | null;
  order_index: number;
  created_at: string;
}

export interface LearningPath {
  id: string;
  class_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface LearningPathStep {
  id: string;
  path_id: string;
  material_id: string | null;
  step_type: 'pretest' | 'material' | 'explore3d' | 'posttest';
  title: string;
  order_index: number;
  is_locked: boolean;
  created_at: string;
}

export interface TestQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

export interface Test {
  id: string;
  class_id: string;
  title: string;
  type: 'pretest' | 'posttest' | 'quiz';
  questions: TestQuestion[];
  created_at: string;
}

export interface Submission {
  id: string;
  test_id: string;
  student_id: string;
  answers: number[];
  score: number;
  submitted_at: string;
}

export interface StepProgress {
  id: string;
  student_id: string;
  step_id: string;
  status: 'locked' | 'in_progress' | 'completed';
  completed_at: string | null;
}

export interface MonitoringLog {
  id: string;
  student_id: string;
  class_id: string;
  event_type: 'visibilitychange' | 'blur' | 'focus' | 'face_absent';
  event_detail: string | null;
  logged_at: string;
}

export interface SyncState {
  id: string;
  class_id: string;
  current_phase: 'idle' | 'pretest' | 'material' | 'explore3d' | 'posttest';
  updated_by: string | null;
  updated_at: string;
}
