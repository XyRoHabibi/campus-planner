-- Campus Planner — Tahap 2: skema inti (prd.md §14–15).
--
-- Prinsip:
--  * Semua tabel memuat user_id (default auth.uid()) dan memakai UUID sebagai primary key.
--  * Relasi anak→induk memakai FOREIGN KEY KOMPOSIT (id, user_id): database sendiri menjamin
--    anak dan induknya dimiliki user yang sama, tanpa mengandalkan subquery di policy RLS.
--  * RLS diaktifkan di migration berikutnya (20261004000200_rls.sql).

-- ---------------------------------------------------------------------------
-- Tipe enum
-- ---------------------------------------------------------------------------
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.task_status as enum ('todo', 'in_progress', 'done');
-- pending: baris dibuat, file belum terkonfirmasi tersimpan
-- uploaded: server mengonfirmasi objek ada di Storage
-- failed: upload gagal, bisa dicoba lagi
-- deleting: sedang dihapus (objek Storage dulu, baru baris)
-- delete_failed: objek Storage gagal dihapus — baris SENGAJA dipertahankan agar bisa dibersihkan ulang
create type public.attachment_status as enum ('pending', 'uploaded', 'failed', 'deleting', 'delete_failed');

-- ---------------------------------------------------------------------------
-- Fungsi trigger umum
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- user_id tidak boleh dipindahkan ke pengguna lain lewat UPDATE.
create function public.prevent_user_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id tidak boleh diubah' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  code text check (code is null or char_length(code) <= 50),
  instructor text check (instructor is null or char_length(instructor) <= 200),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  semester text check (semester is null or char_length(semester) <= 50),
  notes text check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index courses_user_id_idx on public.courses (user_id);

-- ---------------------------------------------------------------------------
-- class_sessions (jadwal kuliah berulang mingguan)
-- ---------------------------------------------------------------------------
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Minggu
  start_time time not null,
  end_time time not null,
  room text check (room is null or char_length(room) <= 200),
  instructor text check (instructor is null or char_length(instructor) <= 200), -- null = warisi dosen mata kuliah
  start_date date,
  end_date date,
  notes text check (notes is null or char_length(notes) <= 5000),
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (start_date is null or end_date is null or end_date >= start_date),
  -- Hapus mata kuliah ⇒ sesinya ikut terhapus. Aplikasi wajib menampilkan konfirmasi dampak lebih dulu.
  foreign key (course_id, user_id) references public.courses (id, user_id) on delete cascade
);
create index class_sessions_user_day_idx on public.class_sessions (user_id, day_of_week);
create index class_sessions_course_id_idx on public.class_sessions (course_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text check (description is null or char_length(description) <= 10000),
  due_at timestamptz, -- null = tanpa tenggat (tidak pernah dianggap terlambat)
  due_has_time boolean not null default false,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  reminder_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Hapus mata kuliah ⇒ tugas dilepas (course_id jadi null), TIDAK ikut terhapus.
  -- Kolom user_id sengaja tidak ikut di-null (hanya course_id) — sintaks butuh PostgreSQL 15+.
  foreign key (course_id, user_id) references public.courses (id, user_id) on delete set null (course_id)
);
create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_user_due_idx on public.tasks (user_id, due_at);
create index tasks_course_id_idx on public.tasks (course_id);

-- completed_at mengikuti status: terisi saat selesai, kosong saat dibuka kembali.
create function public.sync_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    new.completed_at = coalesce(new.completed_at, now());
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_completed_at
  before insert or update on public.tasks
  for each row execute function public.sync_task_completed_at();

-- ---------------------------------------------------------------------------
-- task_attachments (metadata; binary ada di Storage bucket `task-attachments`)
-- ---------------------------------------------------------------------------
create table public.task_attachments (
  -- id dibuat oleh client (crypto.randomUUID) karena menjadi bagian dari storage_key.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid not null,
  original_file_name text not null check (char_length(btrim(original_file_name)) between 1 and 255), -- hanya label tampilan
  storage_key text not null unique,
  content_type text not null check (content_type in (
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
  )),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520), -- 20 MB
  upload_status public.attachment_status not null default 'pending',
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  -- Path wajib persis `user_id/task_id/attachment_id.ext` dengan ekstensi dari daftar yang diizinkan;
  -- nama file asli pengguna tidak pernah dipakai sebagai nama objek.
  -- (Memakai operator regex ~ yang selalu true/false; CHECK yang bernilai NULL akan lolos begitu saja.)
  constraint task_attachments_storage_key_format check (
    storage_key ~ ('^' || user_id::text || '/' || task_id::text || '/' || id::text
      || '\.(pdf|doc|docx|ppt|pptx|xls|xlsx|csv|jpg|jpeg|png|webp|txt)$')
  )
);
create index task_attachments_task_id_idx on public.task_attachments (task_id);
create index task_attachments_user_id_idx on public.task_attachments (user_id);

-- Aturan insert lampiran, ditegakkan di server (bukan hanya UI): status awal harus 'pending'
-- ("uploaded" hanya lewat UPDATE setelah objek ada) dan maksimum 5 lampiran per tugas.
create function public.enforce_attachment_insert_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.upload_status <> 'pending' then
    raise exception 'Lampiran baru harus berstatus pending' using errcode = '23514';
  end if;
  -- Kunci baris tugas agar dua insert bersamaan tidak sama-sama lolos hitungan.
  perform 1 from public.tasks where id = new.task_id and user_id = new.user_id for update;
  if (select count(*) from public.task_attachments where task_id = new.task_id) >= 5 then
    raise exception 'Satu tugas maksimal memiliki 5 lampiran' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger task_attachments_insert_rules
  before insert on public.task_attachments
  for each row execute function public.enforce_attachment_insert_rules();

-- Field identitas lampiran tidak boleh diubah; transisi status dibatasi; "uploaded" hanya sah
-- jika objeknya benar-benar ada di Storage (konfirmasi server, prd.md §9.6 langkah 6).
-- SECURITY DEFINER agar bisa membaca storage.objects; search_path dikosongkan demi keamanan.
create function public.guard_attachment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.task_id is distinct from old.task_id
     or new.storage_key is distinct from old.storage_key
     or new.content_type is distinct from old.content_type
     or new.size_bytes is distinct from old.size_bytes then
    raise exception 'Data identitas lampiran tidak boleh diubah' using errcode = '42501';
  end if;

  if new.upload_status is distinct from old.upload_status then
    if not (
      (old.upload_status = 'pending'       and new.upload_status in ('uploaded', 'failed', 'deleting')) or
      (old.upload_status = 'failed'        and new.upload_status in ('pending', 'deleting')) or
      (old.upload_status = 'uploaded'      and new.upload_status = 'deleting') or
      (old.upload_status = 'deleting'      and new.upload_status = 'delete_failed') or
      (old.upload_status = 'delete_failed' and new.upload_status = 'deleting')
    ) then
      raise exception 'Perubahan status lampiran % -> % tidak diizinkan', old.upload_status, new.upload_status
        using errcode = '23514';
    end if;

    if new.upload_status = 'uploaded' then
      if not exists (
        select 1 from storage.objects
        where bucket_id = 'task-attachments' and name = new.storage_key
      ) then
        raise exception 'File belum tersimpan di Storage' using errcode = '23514';
      end if;
      new.uploaded_at = now();
    end if;
  end if;
  return new;
end;
$$;

create trigger task_attachments_guard_update
  before update on public.task_attachments
  for each row execute function public.guard_attachment_update();

-- ---------------------------------------------------------------------------
-- updated_at & immutability user_id untuk tabel yang bisa diubah
-- ---------------------------------------------------------------------------
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger class_sessions_updated_at before update on public.class_sessions
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger courses_user_id_immutable before update on public.courses
  for each row execute function public.prevent_user_id_change();
create trigger class_sessions_user_id_immutable before update on public.class_sessions
  for each row execute function public.prevent_user_id_change();
create trigger tasks_user_id_immutable before update on public.tasks
  for each row execute function public.prevent_user_id_change();
