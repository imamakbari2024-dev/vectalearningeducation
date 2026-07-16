/*
# Fix RLS infinite recursion on classes table

## Masalah
Policy SELECT pada tabel `classes` melakukan subquery ke `class_enrollments`,
yang policy SELECT-nya juga melakukan subquery ke `classes` — ini menyebabkan
infinite recursion detected in policy.

## Solusi
1. Buat function `is_student_enrolled(class_uuid)` dengan SECURITY DEFINER
   yang mengecek pendaftaran siswa TANPA memicu RLS (karena function berjalan
   sebagai definer, melewati RLS).
2. Sederhanakan policy SELECT pada `classes` — gunakan function tersebut
   alih-alih subquery langsung ke `class_enrollments`.
3. Sederhanakan policy SELECT pada `class_enrollments` — cek `student_id`
   langsung atau gunakan function `is_teacher_of_class` yang juga
   SECURITY DEFINER.
4. Bersihkan policy lain yang mungkin memiliki pola serupa.

## Perubahan
- Tambah function `is_student_enrolled(p_class_uuid uuid)` → boolean
- Tambah function `is_teacher_of_class(p_class_uuid uuid)` → boolean
- Rewrite SELECT policy pada `classes` menggunakan function
- Rewrite SELECT policy pada `class_enrollments` menggunakan function
- Rewrite SELECT policy pada `materials`, `learning_paths`, `tests`,
  `sync_state`, `monitoring_logs` menggunakan function
*/

-- Function: cek apakah user saat ini terdaftar sebagai siswa di kelas tertentu
CREATE OR REPLACE FUNCTION public.is_student_enrolled(p_class_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_enrollments
    WHERE class_id = p_class_uuid AND student_id = auth.uid()
  );
$$;

-- Function: cek apakah user saat ini adalah guru dari kelas tertentu
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(p_class_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_uuid AND teacher_id = auth.uid()
  );
$$;

-- Function: cek apakah user saat ini adalah guru dari test tertentu
CREATE OR REPLACE FUNCTION public.is_teacher_of_test(p_test_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tests t
    JOIN public.classes c ON c.id = t.class_id
    WHERE t.id = p_test_uuid AND c.teacher_id = auth.uid()
  );
$$;

-- Function: cek apakah user saat ini adalah guru dari langkah tertentu
CREATE OR REPLACE FUNCTION public.is_teacher_of_step(p_step_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_path_steps lps
    JOIN public.learning_paths lp ON lp.id = lps.path_id
    JOIN public.classes c ON c.id = lp.class_id
    WHERE lps.id = p_step_uuid AND c.teacher_id = auth.uid()
  );
$$;

-- REWRITE CLASSES SELECT POLICY
DROP POLICY IF EXISTS "select_own_classes" ON classes;
CREATE POLICY "select_own_classes" ON classes FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR public.is_student_enrolled(id)
  );

-- REWRITE CLASS_ENROLLMENTS SELECT POLICY
DROP POLICY IF EXISTS "select_enrollments" ON class_enrollments;
CREATE POLICY "select_enrollments" ON class_enrollments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.is_teacher_of_class(class_id)
  );

-- REWRITE MATERIALS SELECT POLICY
DROP POLICY IF EXISTS "select_materials" ON materials;
CREATE POLICY "select_materials" ON materials FOR SELECT
  TO authenticated USING (
    public.is_teacher_of_class(class_id)
    OR public.is_student_enrolled(class_id)
  );

-- REWRITE LEARNING_PATHS SELECT POLICY
DROP POLICY IF EXISTS "select_learning_paths" ON learning_paths;
CREATE POLICY "select_learning_paths" ON learning_paths FOR SELECT
  TO authenticated USING (
    public.is_teacher_of_class(class_id)
    OR public.is_student_enrolled(class_id)
  );

-- REWRITE LEARNING_PATH_STEPS SELECT POLICY
DROP POLICY IF EXISTS "select_steps" ON learning_path_steps;
CREATE POLICY "select_steps" ON learning_path_steps FOR SELECT
  TO authenticated USING (
    public.is_teacher_of_step(id)
    OR EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_steps.path_id
      AND public.is_student_enrolled(lp.class_id)
    )
  );

-- REWRITE TESTS SELECT POLICY
DROP POLICY IF EXISTS "select_tests" ON tests;
CREATE POLICY "select_tests" ON tests FOR SELECT
  TO authenticated USING (
    public.is_teacher_of_class(class_id)
    OR public.is_student_enrolled(class_id)
  );

-- REWRITE SUBMISSIONS SELECT POLICY
DROP POLICY IF EXISTS "select_submissions" ON submissions;
CREATE POLICY "select_submissions" ON submissions FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.is_teacher_of_test(test_id)
  );

-- REWRITE STEP_PROGRESS SELECT POLICY
DROP POLICY IF EXISTS "select_own_progress" ON step_progress;
CREATE POLICY "select_own_progress" ON step_progress FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.is_teacher_of_step(step_id)
  );

-- REWRITE MONITORING_LOGS SELECT POLICY
DROP POLICY IF EXISTS "select_monitoring" ON monitoring_logs;
CREATE POLICY "select_monitoring" ON monitoring_logs FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.is_teacher_of_class(class_id)
  );

-- REWRITE SYNC_STATE SELECT POLICY
DROP POLICY IF EXISTS "select_sync_state" ON sync_state;
CREATE POLICY "select_sync_state" ON sync_state FOR SELECT
  TO authenticated USING (
    public.is_teacher_of_class(class_id)
    OR public.is_student_enrolled(class_id)
  );
