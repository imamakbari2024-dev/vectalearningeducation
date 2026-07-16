/*
# Create materials storage bucket

## Tujuan
Membuat storage bucket untuk menyimpan file materi yang diunggah guru
(PDF, Video, model 3D .glb/.gltf).

## Perubahan
1. Storage bucket `materials` (public read, authenticated write)
2. Storage policies:
   - SELECT: public (anon + authenticated) — siswa perlu download materi
   - INSERT/UPDATE/DELETE: authenticated only (guru mengunggah)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: siapa saja bisa membaca (download materi)
DROP POLICY IF EXISTS "materials_public_read" ON storage.objects;
CREATE POLICY "materials_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'materials');

-- Policy: hanya authenticated bisa upload
DROP POLICY IF EXISTS "materials_auth_insert" ON storage.objects;
CREATE POLICY "materials_auth_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'materials');

-- Policy: hanya authenticated bisa update
DROP POLICY IF EXISTS "materials_auth_update" ON storage.objects;
CREATE POLICY "materials_auth_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'materials') WITH CHECK (bucket_id = 'materials');

-- Policy: hanya authenticated bisa delete
DROP POLICY IF EXISTS "materials_auth_delete" ON storage.objects;
CREATE POLICY "materials_auth_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'materials');
