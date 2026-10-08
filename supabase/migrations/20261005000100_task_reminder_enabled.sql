-- Campus Planner — Tahap 10: pengingat bisa dimatikan per tugas (prd.md §9.8).
--
-- `tasks.reminder_at` (timestamp) tidak bisa menyatakan "pengingat dimatikan", sehingga ditambahkan flag eksplisit,
-- setara dengan `class_sessions.reminder_enabled` yang sudah ada sejak Tahap 2.
--
-- Perubahan ini aditif dan non-destruktif: baris yang sudah ada otomatis mendapat `true` (pengingat aktif).
-- RLS, trigger, dan indeks yang ada tidak berubah; policy tabel `tasks` berlaku untuk kolom baru ini.
-- TERAPKAN SEBELUM menjalankan versi aplikasi Tahap 10 — aplikasi membaca dan menulis kolom ini.

alter table public.tasks
  add column reminder_enabled boolean not null default true;
