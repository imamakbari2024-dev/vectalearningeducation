/*
# Vecta Learning LMS - Core Schema

## Tujuan
Membuat skema database lengkap untuk LMS Vecta Learning dengan dukungan
manajemen kelas, materi, alur belajar, ujian, pengumpulan jawaban, dan
monitoring perilaku siswa.

## Tabel Baru
1. profiles - Profil pengguna (guru/siswa)
2. classes - Kelas yang dibuat guru
3. class_enrollments - Pendaftaran siswa ke kelas
4. materials - Materi diunggah guru
5. learning_paths - Alur belajar per kelas
6. learning_path_steps - Langkah dalam alur
7. tests - Bank soal / ujian
8. submissions - Jawaban siswa
9. step_progress - Progres siswa per langkah
10. monitoring_logs - Log monitoring perilaku
11. sync_state - State sinkronisasi real-time

## Keamanan (RLS)
- Semua tabel mengaktifkan RLS.
- Owner-scoped CRUD dengan auth.uid().
- Guru bisa akses kelas yang dia buat; siswa bisa akses kelas tempat dia terdaftar.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('guru', 'siswa')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CLASS_ENROLLMENTS (created before classes policies reference it)
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE (class_id, student_id)
);
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_code text UNIQUE NOT NULL,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Now add FK on class_enrollments referencing classes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'class_enrollments_class_id_fkey'
  ) THEN
    ALTER TABLE class_enrollments
      ADD CONSTRAINT class_enrollments_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- CLASSES POLICIES
DROP POLICY IF EXISTS "select_own_classes" ON classes;
CREATE POLICY "select_own_classes" ON classes FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM class_enrollments e
      WHERE e.class_id = classes.id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_classes" ON classes;
CREATE POLICY "insert_own_classes" ON classes FOR INSERT
  TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "update_own_classes" ON classes;
CREATE POLICY "update_own_classes" ON classes FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_classes" ON classes;
CREATE POLICY "delete_own_classes" ON classes FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

-- CLASS_ENROLLMENTS POLICIES
DROP POLICY IF EXISTS "select_enrollments" ON class_enrollments;
CREATE POLICY "select_enrollments" ON class_enrollments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM classes c WHERE c.id = class_enrollments.class_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_enrollment" ON class_enrollments;
CREATE POLICY "insert_own_enrollment" ON class_enrollments FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_enrollment" ON class_enrollments;
CREATE POLICY "delete_own_enrollment" ON class_enrollments FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- MATERIALS
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('pdf', 'video', 'model3d')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  text_content text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_materials" ON materials;
CREATE POLICY "select_materials" ON materials FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = materials.class_id AND c.teacher_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM class_enrollments e WHERE e.class_id = materials.class_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_materials" ON materials;
CREATE POLICY "insert_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = materials.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_materials" ON materials;
CREATE POLICY "update_materials" ON materials FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = materials.class_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = materials.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_materials" ON materials;
CREATE POLICY "delete_materials" ON materials FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = materials.class_id AND c.teacher_id = auth.uid())
  );

-- LEARNING_PATHS
CREATE TABLE IF NOT EXISTS learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_learning_paths" ON learning_paths;
CREATE POLICY "select_learning_paths" ON learning_paths FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = learning_paths.class_id AND c.teacher_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM class_enrollments e WHERE e.class_id = learning_paths.class_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_learning_paths" ON learning_paths;
CREATE POLICY "insert_learning_paths" ON learning_paths FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = learning_paths.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_learning_paths" ON learning_paths;
CREATE POLICY "update_learning_paths" ON learning_paths FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = learning_paths.class_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = learning_paths.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_learning_paths" ON learning_paths;
CREATE POLICY "delete_learning_paths" ON learning_paths FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = learning_paths.class_id AND c.teacher_id = auth.uid())
  );

-- LEARNING_PATH_STEPS
CREATE TABLE IF NOT EXISTS learning_path_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE SET NULL,
  step_type text NOT NULL CHECK (step_type IN ('pretest', 'material', 'explore3d', 'posttest')),
  title text NOT NULL,
  order_index integer DEFAULT 0,
  is_locked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_steps" ON learning_path_steps;
CREATE POLICY "select_steps" ON learning_path_steps FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning_paths lp
      JOIN classes c ON c.id = lp.class_id
      WHERE lp.id = learning_path_steps.path_id AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM learning_paths lp
      JOIN class_enrollments e ON e.class_id = lp.class_id
      WHERE lp.id = learning_path_steps.path_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_steps" ON learning_path_steps;
CREATE POLICY "insert_steps" ON learning_path_steps FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning_paths lp
      JOIN classes c ON c.id = lp.class_id
      WHERE lp.id = learning_path_steps.path_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_steps" ON learning_path_steps;
CREATE POLICY "update_steps" ON learning_path_steps FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning_paths lp
      JOIN classes c ON c.id = lp.class_id
      WHERE lp.id = learning_path_steps.path_id AND c.teacher_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning_paths lp
      JOIN classes c ON c.id = lp.class_id
      WHERE lp.id = learning_path_steps.path_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_steps" ON learning_path_steps;
CREATE POLICY "delete_steps" ON learning_path_steps FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning_paths lp
      JOIN classes c ON c.id = lp.class_id
      WHERE lp.id = learning_path_steps.path_id AND c.teacher_id = auth.uid()
    )
  );

-- TESTS
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('pretest', 'posttest', 'quiz')),
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tests" ON tests;
CREATE POLICY "select_tests" ON tests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = tests.class_id AND c.teacher_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM class_enrollments e WHERE e.class_id = tests.class_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_tests" ON tests;
CREATE POLICY "insert_tests" ON tests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = tests.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_tests" ON tests;
CREATE POLICY "update_tests" ON tests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = tests.class_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = tests.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_tests" ON tests;
CREATE POLICY "delete_tests" ON tests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = tests.class_id AND c.teacher_id = auth.uid())
  );

-- SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  submitted_at timestamptz DEFAULT now()
);
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_submissions" ON submissions;
CREATE POLICY "select_submissions" ON submissions FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tests t
      JOIN classes c ON c.id = t.class_id
      WHERE t.id = submissions.test_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_submission" ON submissions;
CREATE POLICY "insert_own_submission" ON submissions FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "update_own_submission" ON submissions;
CREATE POLICY "update_own_submission" ON submissions FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- STEP_PROGRESS
CREATE TABLE IF NOT EXISTS step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES learning_path_steps(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed')),
  completed_at timestamptz,
  UNIQUE (student_id, step_id)
);
ALTER TABLE step_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON step_progress;
CREATE POLICY "select_own_progress" ON step_progress FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM learning_path_steps lps
      JOIN learning_paths lp ON lp.id = lps.path_id
      JOIN classes c ON c.id = lp.class_id
      WHERE lps.id = step_progress.step_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_progress" ON step_progress;
CREATE POLICY "insert_own_progress" ON step_progress FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "update_own_progress" ON step_progress;
CREATE POLICY "update_own_progress" ON step_progress FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- MONITORING_LOGS
CREATE TABLE IF NOT EXISTS monitoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('visibilitychange', 'blur', 'focus', 'face_absent')),
  event_detail text,
  logged_at timestamptz DEFAULT now()
);
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_monitoring" ON monitoring_logs;
CREATE POLICY "select_monitoring" ON monitoring_logs FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id = monitoring_logs.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_monitoring" ON monitoring_logs;
CREATE POLICY "insert_own_monitoring" ON monitoring_logs FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

-- SYNC_STATE
CREATE TABLE IF NOT EXISTS sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid UNIQUE NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  current_phase text NOT NULL DEFAULT 'idle' CHECK (current_phase IN ('idle', 'pretest', 'material', 'explore3d', 'posttest')),
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sync_state" ON sync_state;
CREATE POLICY "select_sync_state" ON sync_state FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = sync_state.class_id AND c.teacher_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM class_enrollments e WHERE e.class_id = sync_state.class_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_sync_state" ON sync_state;
CREATE POLICY "insert_sync_state" ON sync_state FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = sync_state.class_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_sync_state" ON sync_state;
CREATE POLICY "update_sync_state" ON sync_state FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = sync_state.class_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = sync_state.class_id AND c.teacher_id = auth.uid())
  );

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_class ON materials(class_id);
CREATE INDEX IF NOT EXISTS idx_steps_path ON learning_path_steps(path_id);
CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON step_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_student ON monitoring_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_class ON monitoring_logs(class_id);

-- TRIGGER: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'siswa')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
