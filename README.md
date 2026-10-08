# Campus Planner

Aplikasi planner untuk jadwal kuliah, tugas, tenggat, dan lampiran mahasiswa.
Spesifikasi lengkap ada di [`prd.md`](./prd.md); aturan kerja di [`CLAUDE.md`](./CLAUDE.md).

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix UI (gaya shadcn/ui) · Lucide · React Router · TanStack Query · React Hook Form + Zod · Supabase (Auth, PostgreSQL, Storage) · `vite-plugin-pwa`/Workbox · Cloudflare Pages.

**Dokumen:** [`docs/DEPLOY.md`](./docs/DEPLOY.md) — panduan & checklist deploy · [`docs/ACCEPTANCE.md`](./docs/ACCEPTANCE.md) — audit acceptance criteria PRD dan Definition of Done (termasuk apa yang belum diverifikasi).

## Status

| Tahap | Isi | Status |
|---|---|---|
| 1 | Fondasi: layout responsif, routing, design system | Selesai |
| 2 | Supabase: migration, RLS, bucket privat, client, tes isolasi | Selesai — terbukti di Supabase asli (`test:remote`) |
| 3 | Autentikasi: login/logout, route guard, sesi, pembersihan cache | Selesai — login lewat Auth asli teruji di `test:remote`; form login diuji di browser |
| 4 | Mata Kuliah (CRUD, dampak hapus) | Selesai — terbukti di Supabase asli |
| 5 | Jadwal (CRUD, harian/mingguan, bentrok, periode semester) | Selesai — terbukti di Supabase asli |
| 6 | Tugas (CRUD, selesai/buka kembali, filter, hapus + pembersihan lampiran) | Selesai — terbukti di Supabase asli |
| 7 | Beranda: audit terhadap PRD §9.2 + status koneksi/sinkronisasi | Selesai |
| 8 | Lampiran (validasi, upload berprogres, retry, pratinjau/unduh, hapus) | Selesai — jalur upload & hapus terbukti di Supabase asli |
| 9 | Kalender gabungan (bulan, minggu, hari) | Selesai |
| 10 | Pengaturan + pengingat (dalam aplikasi, notifikasi browser) | Selesai — migration `20261005000100` diterapkan dan teruji |
| 11 | PWA + mode offline baca-saja + code splitting | Selesai — diuji E2E pada build produksi |
| 12 | Persiapan deploy: panduan, header keamanan (CSP), audit acceptance & secret | Selesai — **belum di-deploy** (menunggu persetujuan pemilik) |

**MVP lengkap dan siap deploy.** `test:remote` terhadap project Supabase asli: 85/85 pemeriksaan lulus. Belum ada commit git, deploy, maupun perubahan DNS;
semuanya dilakukan pemilik mengikuti [`docs/DEPLOY.md`](./docs/DEPLOY.md). Hal yang belum diverifikasi (perangkat/browser nyata, screen reader, dsb.) dicatat jujur di
[`docs/ACCEPTANCE.md`](./docs/ACCEPTANCE.md).

## Menjalankan

Butuh Node 20+ (diuji di Node 22).

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc -b
npm run lint         # oxlint
npm run build        # typecheck + production build ke dist/
npm run preview      # menjalankan hasil build produksi (di sinilah service worker aktif; tidak aktif di `npm run dev`)
npm test             # tes unit (Vitest, 153 tes): logika murni, mapper, validasi, cache offline
npm run test:db      # tes skema + RLS offline (PGlite, 24 tes), tanpa kredensial
npm run test:remote  # tes dua akun terhadap project Supabase asli (lihat bawah)
```

`.env.example` memuat nama variabel Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
Salin ke `.env.local` (sudah di-ignore git). **Jangan pernah** menaruh service-role key di frontend atau repo.

## Setup Supabase

Migration ada di `supabase/migrations/` (urut menurut nama file) dan diterapkan oleh pemilik proyek (bukan oleh Claude Code).

1. Buat project Supabase **Free**. Jangan aktifkan add-on/pay-as-you-go. Catat bahwa project Free dapat dijeda saat tidak aktif (buka dashboard untuk mengaktifkan lagi).
2. **Matikan signup publik:** Authentication → Sign In / Providers → Email → nonaktifkan *Allow new users to sign up* (tanpa ini, siapa pun yang memegang anon key bisa memanggil `signUp`, walau UI tidak punya form daftar). Reset password lewat email tidak dipakai di MVP.
3. Buat akun pemilik + **2 akun test khusus** secara manual: Authentication → Users → Add user.
4. Terapkan migration, pilih salah satu:
   - **SQL Editor:** jalankan isi **keempat** file di `supabase/migrations/` berurutan (`…100_core_schema`, `…200_rls`, `…300_storage`, lalu `20261005000100_task_reminder_enabled` — Tahap 10). Butuh PostgreSQL 15+ (default project Supabase saat ini).
   - **CLI:** `npx supabase login`, `npx supabase link --project-ref <ref>`, lalu `npx supabase db push`. (Jika diminta, jalankan `npx supabase init` dulu; ia hanya membuat `config.toml`.)
5. Isi `.env.local` dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (anon/publishable key dari Project Settings → API). **Jangan** memakai atau menyimpan service-role/secret key di frontend, repo, atau screenshot; client menolak key semacam itu.
6. Jalankan uji isolasi dua akun: salin `supabase/tests/remote-rls.env.example` ke `.env.test.local`, isi, lalu `npm run test:remote`. Skrip hanya memakai anon key + login akun test, dan hanya menghapus data yang dibuatnya sendiri (berawalan `[TEST]`).

### Desain data singkat

- Semua tabel: PK UUID, `user_id default auth.uid()`, RLS aktif dengan 4 policy (select/insert/update/delete) hanya untuk `authenticated`; `anon` tidak punya akses.
- Relasi memakai **FOREIGN KEY komposit `(id, user_id)`** sehingga anak dan induk dijamin satu pemilik oleh database sendiri.
- Hapus mata kuliah: `class_sessions` ikut terhapus; `tasks` dilepas (`course_id` → null). UI wajib menampilkan konfirmasi dampak (Tahap 4).
- Lampiran: bucket privat `task-attachments` (20 MB, whitelist MIME), path `user_id/task_id/attachment_id.ext` dipaksa oleh constraint, maksimal 5 per tugas (trigger), status `uploaded` hanya sah jika objek benar-benar ada di Storage, transisi status dibatasi.
- Alur hapus lampiran: `deleting` → hapus objek Storage → hapus baris. Jika hapus objek gagal → `delete_failed` (baris dipertahankan agar terlihat dan bisa diulang).

### Batasan yang perlu diketahui

- Storage memvalidasi `Content-Type` yang dikirim client, **bukan isi file**. Pemeriksaan isi (magic bytes) dilakukan di browser (Tahap 8); pemeriksaan isi di server memerlukan Edge Function dan di luar stack MVP.
- Menghapus **tugas** meng-cascade baris lampirannya, tetapi tidak bisa menghapus objek Storage dari SQL. Aplikasi harus membersihkan objek lebih dulu (Tahap 6/8) dan membatalkan hapus tugas bila ada yang gagal — jika dilewati, objek yatim tersisa di bucket.
- `npm run test:db` menguji logika SQL di PGlite dengan stub schema `auth`/`storage`; ia **tidak** menguji layanan Supabase asli (batas bucket, API Storage). Itu tugas `npm run test:remote` (85/85 pemeriksaan lulus terhadap project Supabase pemilik).

## Struktur

```text
src/
  app/                 App, router (lazy per rute), providers
  components/
    layout/            Sidebar (desktop), BottomNav + menu "Lainnya" (mobile), AppLayout, AccountMenu
    shared/            PageHeader, EmptyState/ErrorState/OfflineUnavailable, ConfirmDialog, CourseTag, RouteLoading
    ui/                Button, Card, Badge, Skeleton, field (input/select/checkbox), Modal, BottomSheet, Switch
  features/            Satu folder per domain; tiap fitur punya api.ts + hooks.ts (+ komponen)
    auth/  courses/  schedule/  tasks/  attachments/  calendar/  dashboard/  reminders/  settings/  offline/
  lib/
    supabase/          Client (lazy, menolak key rahasia) + query.ts (error ramah, unwrap)
    utils/             tanggal (id-ID), agenda, jadwal/bentrok, kalender, pengingat, sinkronisasi
    offline/           Cache IndexedDB per pengguna (whitelist ketat)
    settings/          Preferensi (tema per perangkat, lainnya per pengguna)
    pwa/               Pendaftaran service worker, state instalasi
    query/             queryGate (loading / offline / error / ready)
  styles/index.css     Design tokens (palet PRD §10), terang/gelap
supabase/
  migrations/          4 migration (skema, RLS, Storage, reminder_enabled)
  tests/               test:db (PGlite) dan test:remote (dua akun, project asli)
public/                ikon PWA, _headers (cache + CSP), theme-init.js
wrangler.jsonc         Konfigurasi deploy Cloudflare (aset dari dist, SPA fallback)
docs/                  DEPLOY.md, ACCEPTANCE.md
```

## Mata Kuliah (Tahap 4)

- Rute: `/courses` (daftar + tambah) dan `/courses/:id` (detail: info, jadwal & tugas terkait, ubah, hapus). `/courses/:id` adalah tambahan di luar daftar rute PRD §8.
- Validasi di browser dengan Zod memakai batas yang sama dengan CHECK constraint database; database tetap penegak terakhir. `user_id` tidak pernah dikirim dari UI.
- **Hapus mata kuliah**: dialog menghitung dampak langsung dari server (jumlah jadwal yang ikut terhapus dan tugas yang dilepas), tombol konfirmasi nonaktif sampai angkanya termuat; jika gagal dihitung, penghapusan tidak bisa dikonfirmasi.
- Offline: tombol tambah/ubah/hapus dinonaktifkan dan form menjelaskan bahwa menyimpan memerlukan koneksi; isian tidak hilang jika gagal simpan.
- Pembacaan `class_sessions` dan `tasks` ikut disambungkan ke Supabase (read-only) karena detail mata kuliah dan dialog dampak membutuhkannya; tulis-nya di Tahap 5 dan 6. Jumlah lampiran di tugas hanya menghitung lampiran berstatus `uploaded`.
- Retry bawaan postgrest-js dimatikan (`db.retry: false`); retry diatur TanStack Query agar pesan error muncul cepat saat offline.
- Menjalankan ulang `npm run test:remote` kini juga memeriksa tugas (CRUD, status, hapus + Storage), jadwal, serta query aplikasi, cascade hapus mata kuliah, dan bahwa objek Storage benar-benar terhapus.

## Jadwal (Tahap 5)

- `/schedule`: tampilan **Harian** (pilih hari dalam minggu) dan **Mingguan** (agenda per hari), navigasi minggu sebelumnya/berikutnya + "Hari ini". Di HP selalu berupa daftar vertikal (tanpa tabel yang memaksa scroll horizontal). Minggu dimulai Senin sampai Pengaturan (Tahap 10) menambah pilihan.
- Mengetuk sesi (di Jadwal, Beranda, atau detail Mata Kuliah) membuka detail dengan aksi Ubah dan Hapus. "Tambah Jadwal" juga ada di Beranda dan di detail Mata Kuliah (mata kuliah terisi otomatis).
- **Bentrok**: hari sama + jam saling tumpang tindih + periode beririsan (jam yang hanya menempel, mis. selesai 09:00 dan mulai 09:00, bukan bentrok). Peringatan tampil **sebelum menyimpan** dan menyebut sesi yang bentrok; pengguna memilih "Ubah jadwal" atau "Tetap simpan". Mengubah isian membatalkan peringatan lama. Pemeriksaan hanya di sisi aplikasi (sengaja tidak dipaksa database karena bentrok boleh disimpan).
- **Periode semester** (tanggal mulai/akhir, opsional): sesi di luar periode tidak tampil pada tanggal itu — termasuk di Beranda; batas awal dan akhir termasuk.
- Validasi (Zod di browser + CHECK di database): jam selesai harus setelah jam mulai, tanggal akhir tidak boleh sebelum tanggal mulai. Dosen sesi yang kosong mewarisi dosen mata kuliah.
- Offline: tambah/ubah/hapus dinonaktifkan; isian tidak hilang jika gagal simpan.

## PWA dan mode offline (Tahap 11)

- **PWA** (`vite-plugin-pwa`/Workbox, `vite.config.ts`): manifest (nama, ikon 192/512/maskable, `theme_color` #4F46E5, shortcut Tugas & Jadwal), ikon PNG di `public/icons` (dirender dari desain `favicon.svg`; ulangi bila logo berubah), dan service worker yang **hanya meng-precache aset aplikasi** (app shell + semua chunk halaman, 54 entri). Sengaja **tidak ada `runtimeCaching`**: respons Supabase (data, Auth, Storage/lampiran) tidak pernah melewati cache service worker (dicek: `sw.js` tidak memuat rujukan ke Supabase). Deep link (`/tasks`, `/calendar`, …) dilayani offline lewat navigation fallback. Service worker tidak aktif saat `npm run dev`.
- **Pembaruan**: strategi *prompt* — versi baru tidak mengambil alih diam-diam (bisa memutus unggahan); muncul pesan "Versi baru tersedia" dengan tombol **Muat ulang**, dan pembaruan diperiksa tiap jam. `public/_headers` membuat `index.html`, `sw.js`, dan `manifest.webmanifest` tidak di-cache lama, sementara `/assets/*` ber-hash di-cache selamanya; SPA fallback diatur `wrangler.jsonc` (Cloudflare), bukan `_redirects`.
- **Instal**: kartu "Instal aplikasi" di Pengaturan menampilkan tombol hanya jika browser menawarkan (`beforeinstallprompt`, ditangkap sejak awal); jika sudah terpasang menampilkan statusnya; selain itu memberi petunjuk jujur (iOS: Bagikan → Tambahkan ke Layar Utama). Pada uji, Edge sendiri menawarkan instalasi sehingga kriteria PWA terpenuhi.
- **Offline = baca-saja** (prd.md §16, tanpa antrean tulis offline): daftar mata kuliah, jadwal, tugas, dan detail tugas yang terakhir berhasil dimuat disimpan di **IndexedDB** dan dipulihkan saat offline. Tombol tambah/ubah/hapus/selesai dan unggah dinonaktifkan dengan penjelasan; mutasi **tidak** ditahan lalu dijalankan diam-diam saat online (`networkMode: 'always'`), sehingga UI tidak pernah mengklaim tersimpan. Karena tidak ada perubahan lokal yang menunggu, tidak ada status "sinkronisasi tertunda".
- **Status jujur di UI**: banner offline ("menampilkan data terakhir yang tersimpan di perangkat ini"), status di Beranda/Pengaturan ("Offline · menampilkan data terakhir (dimuat hh:mm)"), dan keadaan **"Belum tersedia saat offline"** untuk halaman yang belum pernah dimuat di perangkat ini (bukan skeleton menggantung). Query gagal yang masih punya data (cache/pemuatan ulang gagal) tidak menyembunyikan datanya (`queryGate`). Saat koneksi pulih data dimuat ulang otomatis.
- **Privasi cache** (aturan, diuji E2E):
  1. **Whitelist ketat** kunci query yang disimpan: `courses`, `sessions`, `tasks`, dan `tasks/<id>`. **Lampiran tidak pernah di-cache** — baik file, metadata/nama file, hitungan, maupun signed URL; detail lampiran saat offline dinyatakan "memerlukan koneksi". Tes memaksa keputusan sadar untuk setiap kunci query baru.
  2. **Per pengguna**: satu entri IndexedDB per user id (`campus-planner:rq:<userId>`); saat masuk, cache milik pengguna lain yang tertinggal dihapus.
  3. **Dihapus** saat logout, sesi berakhir, atau aplikasi dimuat tanpa sesi. Cache maksimal 7 hari dan memakai `buster` versi.
- **Code splitting**: halaman dimuat per rute (bundle awal 967 → 383 kB, 123 kB gzip); chunk halaman ikut di-precache sehingga navigasi tetap jalan offline.
- Batasan: tampilan offline hanya sampai data terakhir yang pernah dimuat; masuk (login) membutuhkan koneksi; data yang diubah di perangkat lain tidak tampak sampai online; pengingat tidak berjalan saat aplikasi ditutup (tidak ada push).

## Pengaturan dan pengingat (Tahap 10)

> **Wajib:** terapkan migration `supabase/migrations/20261005000100_task_reminder_enabled.sql` (menambah `tasks.reminder_enabled boolean not null default true`) **sebelum** memakai versi aplikasi ini; aplikasi membaca dan menulis kolom itu. Migration aditif: baris yang ada otomatis berstatus pengingat aktif. `npm run test:remote` memeriksanya.

- **Pengaturan** (`/settings`): Tema (Ikuti sistem / Terang / Gelap; berlaku **per perangkat**, diterapkan sebelum render pertama agar tidak berkedip), hari awal minggu (dipakai Jadwal, Kalender, dan urutan hari di form), Pengingat, Zona waktu, Koneksi & sinkronisasi (status + tombol Perbarui), dan Akun (Keluar). Preferensi lain disimpan di localStorage **per pengguna** (tidak tercampur di perangkat bersama) dan tersinkron antar tab. Nilai rusak/tak valid jatuh ke default; jika browser menolak penyimpanan, pengguna diberi tahu bahwa pengaturan hanya berlaku sampai halaman ditutup.
- **Pengingat** bersifat *berbasis keadaan*: kelas yang akan mulai dalam jeda yang dipilih (5/10/15/30/60 menit) dan tugas yang tenggatnya masuk jeda tetapi belum lewat (1 jam/3 jam/1 hari/2 hari). Tenggat tanpa jam dihitung dari pukul 09.00 hari tenggat. Item yang dimatikan per item (`class_sessions.reminder_enabled`, `tasks.reminder_enabled` — kotak centang di form), tugas selesai, dan sesi di luar periode semester tidak muncul. Pengingat aktif tampil sebagai daftar **Pengingat** di Beranda; hanya yang **baru saja aktif** (≤ 15 menit) yang memunculkan toast, sekali per kejadian (dicatat di sessionStorage), sehingga membuka aplikasi tidak membanjiri pengguna.
- **Notifikasi browser**: opt-in. Izin **hanya diminta saat pengguna mengaktifkan saklar** "Notifikasi browser" (tidak pernah otomatis). Keadaan yang ditangani dengan teks jelas: belum diminta, diberikan, ditolak/diblokir (dengan petunjuk), browser tidak mendukung, dan pengingat dimatikan. Notifikasi hanya dikirim bila diaktifkan + diizinkan + tab sedang tidak terlihat; saat terlihat cukup toast. Ada tombol "Kirim notifikasi percobaan". `new Notification()` dicoba dulu, lalu service worker sebagai cadangan (tersedia setelah Tahap 11).
- **Batasan yang dinyatakan jujur di UI**: pengingat dan notifikasi **hanya berjalan saat Campus Planner terbuka di browser**; pengingat saat aplikasi ditutup (push) belum tersedia.
- Asumsi: pengingat dalam aplikasi aktif secara default (notifikasi browser nonaktif); zona waktu **mengikuti perangkat** dan hanya ditampilkan (tidak ada override — PRD §9.2 menyatakan waktu mengikuti zona waktu perangkat). Tombol instal PWA ada di Pengaturan sejak Tahap 11.
- Perbaikan sampingan: `formatDue` kini relatif terhadap parameter `now` (sebelumnya memakai jam sistem).

## Kalender (Tahap 9)

- `/calendar` menggabungkan **jadwal kuliah** (hari + periode semester) dan **tenggat tugas** (tanggal lokal perangkat; tugas tanpa tenggat tidak masuk kalender). Tampilan **Bulan**, **Minggu**, dan **Hari**, navigasi sebelumnya/berikutnya (bulan tidak "melompat" di akhir bulan, mis. 31 Jan + 1 bulan = 28 Feb) dan tombol "Hari ini".
- **Bulan**: grid dengan penanda per hari berupa **ikon + angka** — kelas (titik warna mata kuliah + jumlah) dan tugas (ikon **terlambat** / **terbuka** / **selesai** + jumlah); prioritas penanda terlambat > terbuka > selesai. Teks lengkap ada di `aria-label` tiap sel (mis. "Jumat, 2 Oktober 2026: 1 tugas, 1 terlambat"). Di HP sel ringkas dan **agenda hari terpilih** (daftar vertikal) tampil di bawah grid; di layar lebar sel memuat judul item dan agenda di panel kanan. Tanpa scroll horizontal.
- **Keyboard**: grid memakai `role="grid"` dengan roving tabindex (satu tab stop); tombol panah memindahkan hari dan fokus mengikuti, termasuk saat berganti bulan.
- **Agenda** (semua tampilan): urut menurut jam; tenggat tanpa jam ("sepanjang hari") di akhir; saat jam sama kelas mendahului tugas. Mengetuk kelas membuka detail jadwal (ubah/hapus), mengetuk tugas membuka detail tugas; tombol selesai/buka kembali tersedia langsung di agenda. Tugas terlambat memakai ikon + teks "Terlambat …"; tugas selesai dicoret dan bercentang.
- Hari awal minggu masih Senin (`DEFAULT_WEEK_START`); pilihan pengguna ditambahkan di Tahap 10. Jika belum ada jadwal maupun tenggat, kalender menampilkan empty state dengan tautan ke Jadwal/Tugas.

## Lampiran (Tahap 8)

- **Validasi di browser** (`features/attachments/validation.ts`): ekstensi (13 format PRD), ukuran (≤ 20 MB, tidak kosong), jumlah (≤ 5 per tugas), dan **isi file** (magic bytes: PDF, PNG, JPEG, WebP, ZIP untuk docx/pptx/xlsx, OLE untuk doc/ppt/xls; teks/CSV tidak boleh memuat byte NUL). `file.type` dari browser **tidak dipercaya**; Content-Type objek selalu tipe kanonis dari ekstensi. Tipe dan ukuran ditampilkan sebelum upload, dan pilihan bisa dibatalkan per file. Server tetap penegak terakhir (CHECK constraint, trigger 5 file, batas & MIME bucket).
- **Alur upload** (`useUploadQueue`): daftarkan baris `pending` → unggah objek (XHR multipart ke endpoint Storage resmi dengan token pengguna, agar ada **progres per file**; `x-upsert: false`) → tandai `uploaded` (trigger database memverifikasi objeknya ada). Sebuah file hanya "Berhasil" setelah konfirmasi server; progres tidak mencapai 100% sebelum itu. Nama objek = `user_id/task_id/attachment_uuid.ext`; **nama file asli hanya label** (disanitasi: tanpa pemisah path/karakter kontrol, ≤ 255 karakter).
- **Gagal & retry**: pesan yang bisa dipahami (koneksi, ukuran, tipe, izin, sesi; pesan mentah tidak ditampilkan). "Coba lagi" memakai baris yang sama (`failed → pending → upload → uploaded`), tanpa membuat tugas atau baris baru. "Batalkan"/buang file gagal membersihkan baris + objek agar tidak memakan kuota. Tab tidak bisa ditutup tanpa peringatan saat upload berjalan.
- **Preview/unduh** lewat signed URL **60 detik**: gambar via `<img>`; teks/CSV sebagai **teks biasa** (tidak pernah HTML; 100.000 karakter pertama); PDF dibuka di tab baru (`noopener`) dari domain penyimpanan; DOC/XLS/PPT "Preview tidak tersedia" tetapi bisa diunduh. Unduhan memakai `Content-Disposition: attachment`. Semua memerlukan koneksi; file tidak di-cache otomatis.
- **Hapus**: `deleting` → hapus objek → hapus baris. Jika objek gagal dihapus, baris dipertahankan sebagai `delete_failed` ("Gagal dihapus dari penyimpanan" + "Coba bersihkan lagi"). Lampiran `pending`/`failed` yang tertinggal tampil jujur ("Belum selesai diunggah"/"Gagal diunggah") dan bisa dihapus.
- **Tambah Tugas dengan lampiran**: tugas disimpan lebih dulu, lalu dialog beralih ke progres per file. Dialog tidak bisa ditutup selama upload; jika sebagian gagal, tugas tetap tersimpan dan file gagal bisa dicoba lagi/dihapus.
- Keterbatasan: isi file diperiksa hanya di browser (bukan di server); file teks berisi HTML tetap diterima sebagai `.txt` tetapi hanya pernah disajikan sebagai `text/plain`/teks biasa. Upload besar tidak dilanjutkan jika halaman dimuat ulang (tidak ada resumable upload di MVP).

## Beranda (Tahap 7 — audit PRD §9.2)

Beranda sudah dibangun bertahap sejak Tahap 1; Tahap 7 mengauditnya butir demi butir. Semua butir §9.2 terpenuhi: tanggal, jumlah & daftar kelas hari ini (urut waktu), kelas berikutnya, tenggat terdekat, tugas terlambat, tombol cepat, empty state + tautan, "Ruangan belum ditentukan", ketuk agenda membuka detail, zona waktu perangkat. Celah yang ditemukan dan diperbaiki:

- **Status koneksi & sinkronisasi** (sebelumnya hanya banner offline global): baris status dengan ikon + teks — Online/diperbarui hh:mm, Memperbarui…, Offline (menampilkan data terakhir, dimuat hh:mm), Gagal memuat/memperbarui — plus tombol **Perbarui**. Waktu yang ditampilkan adalah data **tertua** di antara ketiga sumber (tidak mengklaim lebih segar dari kenyataan). Data hanya disimpan di memori; persistensi offline lintas muat ulang baru di Tahap 11.
- Saat kelas **sedang berlangsung**, kelas berikutnya tetap ditampilkan (sebelumnya disembunyikan).
- Kartu sorotan kelas kini bisa diketuk (membuka detail).
- Tile statistik menampilkan "–" saat gagal dimuat (sebelumnya skeleton selamanya).
- Tugas terlambat dibatasi 3 di Beranda; sisanya lewat tautan ke `/tasks?status=overdue` (membuka tab Terlambat; nilai `status` tak dikenal jatuh ke "Aktif").

## Tugas (Tahap 6)

- `/tasks`: tab status (Aktif/Terlambat/Selesai/Semua + jumlah), cari judul, filter mata kuliah, prioritas, dan **periode tenggat** (hari ini, 7 hari ke depan, bulan ini, tanpa tenggat), urutan (tenggat/prioritas/terbaru). `/tasks/:id`: detail dengan Tandai selesai / Buka kembali, Ubah, Hapus.
- Tombol lingkaran di tiap kartu (Tugas, Beranda, detail Mata Kuliah) menandai selesai / membuka kembali. **Tidak ada pembaruan optimistik**: tombol menampilkan spinner sampai server mengonfirmasi, dan kegagalan ditampilkan jujur lewat toast.
- Buka kembali tugas selesai mengembalikannya ke **"Belum dikerjakan"** (asumsi: status sebelumnya tidak disimpan). `completed_at` diatur trigger database, tidak pernah ditulis UI.
- Tenggat: tanggal wajib jika jam diisi. Tanggal tanpa jam disimpan sebagai **23:59 zona waktu perangkat** dengan `due_has_time = false` (UI tidak menampilkan jam palsu). Tugas tanpa tenggat tidak pernah terlambat; tugas selesai tidak pernah aktif/terlambat (tes unit).
- **Hapus tugas** (`deleteTask`): dialog menghitung jumlah lampiran dari server dan baru bisa dikonfirmasi setelah angkanya diketahui. Urutan: tandai lampiran `deleting` → hapus objek Storage → **hanya jika berhasil** hapus tugas. Jika Storage gagal, tugas TIDAK dihapus, lampiran ditandai `delete_failed` (terlihat dan bisa diulang), dan pengguna diberi pesan jelas. Ini menutup risiko "objek Storage yatim" dari Tahap 2.
- Lampiran dibangun di Tahap 8 (di atas); pengingat per tugas (`reminder_at`) menunggu Tahap 10.

## Autentikasi (Tahap 3)

- Login email+password lewat Supabase Auth; **tanpa** signup publik dan reset password. Semua rute selain `/login` dibungkus `RequireAuth`; tujuan semula (`from`) diingat dan disanitasi (hanya path internal, cegah open redirect).
- Sesi disimpan oleh supabase-js di `localStorage` (refresh otomatis). Jika sesi hilang/berakhir, pengguna diarahkan ke login dengan toast "Sesi Anda telah berakhir".
- Cache TanStack Query dibersihkan saat logout, sesi berakhir, atau pengguna berganti. Cache offline persisten (IndexedDB) dibangun di Tahap 11 dan wajib mengikuti aturan yang sama.
- Tombol **Keluar** ada di sidebar (desktop) dan menu "Lainnya" (mobile) karena halaman Pengaturan baru dibangun di Tahap 10.
- Jika `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` kosong, halaman login menampilkan pesan ramah dan aplikasi tidak dapat dibuka (tidak ada mode lewati login).

## Asumsi Tahap 2

- Penamaan kolom snake_case di database; aplikasi memakai camelCase dan memetakannya di `api.ts` tiap fitur.
- `class_sessions` diberi kolom `instructor` (override dosen per sesi, PRD §9.4) dan `reminder_enabled` (pengingat bisa dimatikan per item, PRD §9.8) — tidak tercantum di model data PRD §15.
- `tasks.due_has_time` membedakan tenggat berjam vs hanya tanggal; tanpa jam, UI tidak menampilkan jam palsu.
- Pengaturan pengguna (tema, hari awal minggu, zona waktu) tidak disimpan di database (PRD hanya menetapkan 4 tabel inti); disimpan lokal di Tahap 10.
- Satu lampiran gagal tetap memakai satu dari 5 slot sampai dihapus atau berhasil diulang.

## Asumsi Tahap 1

- Hari 0 = Minggu (sesuai `Date#getDay`); jam sesi berupa `HH:mm` lokal perangkat.
- Mode gelap mengikuti pengaturan sistem; pilihan manual terang/gelap menyusul di Tahap 10.
- Warna status PRD dipakai untuk ikon/border; teksnya memakai varian lebih gelap agar kontras terbaca. Status selalu disertai ikon dan teks.
- Font: Inter jika terpasang, selain itu font sistem (tidak ada permintaan ke font eksternal, agar kompatibel offline).
- (Dihapus di Tahap 4) Tahap 1 memakai data contoh; kini semua data berasal dari Supabase.
- Ketuk sesi jadwal belum membuka detail (Tahap 5); detail tugas hanya baca (edit di Tahap 6, lampiran di Tahap 8).
