-- Campus Planner — Tahap 2: Row Level Security (prd.md §14 "RLS").
--
-- Aturan: pengguna hanya bisa membaca/membuat/mengubah/menghapus baris miliknya.
-- Tidak ada policy untuk role `anon` sama sekali. RLS TIDAK boleh dimatikan untuk kemudahan development.
-- user_id berasal dari auth.uid() (default kolom); nilai yang dikirim client dan berbeda ditolak WITH CHECK.
-- `(select auth.uid())` dibungkus subquery agar dievaluasi sekali per query, bukan per baris.

alter table public.courses enable row level security;
alter table public.class_sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_attachments enable row level security;

-- Hak akses tingkat tabel: anon tidak punya apa pun; authenticated dibatasi lebih lanjut oleh RLS.
revoke all on public.courses, public.class_sessions, public.tasks, public.task_attachments from anon;
grant select, insert, update, delete on public.courses, public.class_sessions, public.tasks, public.task_attachments
  to authenticated;

-- courses ------------------------------------------------------------------
create policy courses_select_own on public.courses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy courses_insert_own on public.courses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy courses_update_own on public.courses
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy courses_delete_own on public.courses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- class_sessions -----------------------------------------------------------
-- Kepemilikan course induk dijamin FOREIGN KEY komposit (course_id, user_id).
create policy class_sessions_select_own on public.class_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy class_sessions_insert_own on public.class_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy class_sessions_update_own on public.class_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy class_sessions_delete_own on public.class_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- tasks --------------------------------------------------------------------
create policy tasks_select_own on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- task_attachments ---------------------------------------------------------
create policy task_attachments_select_own on public.task_attachments
  for select to authenticated using ((select auth.uid()) = user_id);
-- Lampiran baru selalu "pending"; status "uploaded" hanya lewat UPDATE setelah objek ada (trigger guard).
create policy task_attachments_insert_own on public.task_attachments
  for insert to authenticated
  with check ((select auth.uid()) = user_id and upload_status = 'pending');
create policy task_attachments_update_own on public.task_attachments
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Baris hanya boleh dihapus setelah masuk status "deleting", yaitu setelah objek Storage dibersihkan
-- (jika pembersihan gagal, status "delete_failed" mempertahankan baris sebagai catatan yang terlihat).
create policy task_attachments_delete_own on public.task_attachments
  for delete to authenticated
  using ((select auth.uid()) = user_id and upload_status = 'deleting');
