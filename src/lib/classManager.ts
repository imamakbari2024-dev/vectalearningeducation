import { supabase, type ClassRoom, type Profile } from './supabase';

// Generate kode kelas acak 6 karakter alfanumerik (huruf besar + angka)
export function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Pastikan kode unik — regenerate jika sudah ada
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateClassCode();
    const { data } = await supabase
      .from('classes')
      .select('id')
      .eq('class_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  // Fallback — tambahkan suffix angka
  return generateClassCode() + Math.floor(Math.random() * 10);
}

// Guru membuat kelas baru
export async function createClass(
  name: string,
  teacherId: string
): Promise<{ data: ClassRoom | null; error: string | null }> {
  const code = await generateUniqueCode();
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, class_code: code, teacher_id: teacherId })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ClassRoom, error: null };
}

// Siswa join kelas dengan kode
export async function joinClassByCode(
  code: string,
  studentId: string
): Promise<{ data: ClassRoom | null; error: string | null }> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 6) {
    return { data: null, error: 'Kode kelas harus 6 karakter.' };
  }

  const { data: cls, error: queryError } = await supabase
    .from('classes')
    .select('*')
    .eq('class_code', normalized)
    .maybeSingle();

  if (queryError) return { data: null, error: queryError.message };
  if (!cls) return { data: null, error: 'Kode kelas tidak ditemukan.' };

  const classData = cls as ClassRoom;

  // Cek apakah sudah terdaftar
  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classData.id)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    return { data: classData, error: 'Anda sudah terdaftar di kelas ini.' };
  }

  const { error: enrollError } = await supabase
    .from('class_enrollments')
    .insert({ class_id: classData.id, student_id: studentId });

  if (enrollError) return { data: null, error: enrollError.message };
  return { data: classData, error: null };
}

// Ambil semua kelas milik guru
export async function fetchTeacherClasses(
  teacherId: string
): Promise<ClassRoom[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as ClassRoom[];
}

// Ambil semua kelas tempat siswa terdaftar
export async function fetchStudentClasses(
  studentId: string
): Promise<ClassRoom[]> {
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId);

  if (!enrollments || enrollments.length === 0) return [];

  const classIds = enrollments.map((e) => e.class_id);
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .in('id', classIds)
    .order('created_at', { ascending: false });

  return (classes ?? []) as ClassRoom[];
}

// Ambil daftar siswa di sebuah kelas (untuk guru)
export async function fetchClassStudents(
  classId: string
): Promise<Profile[]> {
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId);

  if (!enrollments || enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', studentIds)
    .order('full_name', { ascending: true });

  return (profiles ?? []) as Profile[];
}

// Hapus kelas (guru)
export async function deleteClass(
  classId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  return { error: error?.message ?? null };
}
