-- Campus Planner — Tahap 2: bucket privat `task-attachments` + policy Storage (prd.md §14 "Storage", §17).
--
-- * Bucket PRIVAT; akses file hanya lewat signed URL berumur pendek yang dibuat client yang berwenang.
-- * Batas 20 MB dan whitelist MIME diterapkan oleh Storage sebagai validasi kedua di server.
--   Catatan: Storage memeriksa Content-Type yang dikirim client, bukan isi (magic bytes) file.
--   Pemeriksaan isi file di browser ada di Tahap 8; pemeriksaan isi di server butuh Edge Function (di luar MVP).
-- * Policy upload/baca/hapus terpisah dan semuanya mengacu ke baris `task_attachments` milik pengguna,
--   sehingga file hanya bisa diakses jika ada metadata yang sah dan dimiliki pengguna tersebut.
-- * Tidak ada policy UPDATE: objek tidak bisa ditimpa/dipindah.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments',
  'task-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upload: hanya ke path yang sudah didaftarkan pengguna sendiri sebagai lampiran pending/failed.
create policy task_attachments_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and exists (
      select 1 from public.task_attachments a
      where a.storage_key = objects.name
        and a.user_id = (select auth.uid())
        and a.upload_status in ('pending', 'failed')
    )
  );

-- Baca / signed URL: hanya file lampiran milik pengguna yang sudah terkonfirmasi tersimpan.
-- Status deleting/delete_failed ikut diizinkan karena DELETE ... RETURNING (dipakai saat remove)
-- juga mensyaratkan baris lolos policy SELECT; tanpa ini penghapusan objek gagal diam-diam.
create policy task_attachments_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1 from public.task_attachments a
      where a.storage_key = objects.name
        and a.user_id = (select auth.uid())
        and a.upload_status in ('uploaded', 'deleting', 'delete_failed')
    )
  );

-- Hapus: hanya setelah lampiran ditandai "deleting" (atau "delete_failed" saat mengulang pembersihan).
create policy task_attachments_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1 from public.task_attachments a
      where a.storage_key = objects.name
        and a.user_id = (select auth.uid())
        and a.upload_status in ('deleting', 'delete_failed')
    )
  );
