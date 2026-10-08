# PRD — Campus Planner

> Aplikasi planner untuk jadwal kuliah, tugas, tenggat, dan lampiran mahasiswa.

| Informasi | Detail |
|---|---|
| Nama produk | Campus Planner (nama sementara) |
| Versi dokumen | 1.0 |
| Tanggal | 3 Oktober 2026 |
| Status | Draft untuk implementasi MVP |
| Bahasa aplikasi | Bahasa Indonesia |
| Platform | Responsive web app + Progressive Web App (PWA) |
| Pengguna utama | Mahasiswa |
| Target biaya layanan | $0 per bulan selama tetap di paket gratis dan dalam kuota |

## 1. Ringkasan produk

Campus Planner membantu mahasiswa mengatur jadwal kuliah, tugas, tenggat, dan file tugas dalam satu aplikasi. Pengguna dapat mengetahui kelas hari ini, melihat kelas berikutnya, mencatat tugas, melampirkan file, dan melacak progres melalui laptop maupun HP.

Aplikasi dibuat sebagai responsive web app dan ditingkatkan menjadi PWA agar dapat dipasang pada perangkat/browser yang mendukung. Ketika offline, pengguna dapat membaca jadwal dan tugas terakhir yang sudah berhasil dimuat. Upload file membutuhkan koneksi internet.

## 2. Masalah pengguna

Mahasiswa sering menyimpan jadwal kuliah, tenggat tugas, dan file perkuliahan di tempat berbeda. Akibatnya, informasi bisa terlewat atau sulit ditemukan, khususnya saat pengguna sedang mengaksesnya lewat HP.

Campus Planner menyatukan kebutuhan tersebut agar pengguna dapat menjawab:

- Ada kuliah apa hari ini?
- Kelas berikutnya mulai jam berapa, dengan dosen siapa, dan di ruangan mana?
- Tugas mana yang paling dekat tenggatnya?
- File yang berkaitan dengan tugas tersimpan di mana?

## 3. Tujuan produk

1. Menampilkan jadwal kuliah dengan mata kuliah, dosen, waktu, dan lokasi.
2. Membantu pengguna mencatat, memprioritaskan, dan menyelesaikan tugas.
3. Memungkinkan pengguna mengunggah dan menemukan file yang terkait dengan tugas.
4. Menyajikan agenda harian yang cepat dipahami di HP maupun desktop.
5. Mendukung instalasi sebagai PWA dan akses baca terhadap data terakhir saat offline.
6. Menjaga target tanpa biaya langganan bulanan untuk MVP, selama pemakaian berada dalam kuota layanan gratis.

## 4. Bukan tujuan MVP

Tidak termasuk rilis pertama:

- Integrasi otomatis dengan sistem akademik kampus atau LMS.
- Pengumpulan tugas langsung ke LMS.
- Pengelolaan nilai dan absensi.
- Pembagian tugas dan kolaborasi kelompok.
- Impor otomatis jadwal kuliah.
- Email, SMS, atau push notification terjadwal ketika aplikasi ditutup.
- Analisis isi file atau fitur AI.
- Penyimpanan file tanpa batas.
- Aplikasi native iOS atau Android.

Fitur tersebut dapat dipertimbangkan setelah kebutuhan inti diuji.

## 5. Pengguna sasaran

### Persona utama

Mahasiswa yang memiliki beberapa mata kuliah dengan jadwal rutin dan tugas dengan tenggat berbeda. Pengguna bekerja dari laptop, tetapi sering mengecek agenda dan file melalui HP.

### Kebutuhan utama

- Melihat jadwal hari ini dengan cepat.
- Mengetahui lokasi dan dosen kelas.
- Membuat tugas dengan tenggat dan prioritas.
- Melampirkan file instruksi, referensi, atau hasil tugas.
- Mendapat pengingat yang tidak mengganggu.
- Membuka jadwal terakhir meskipun koneksi sedang tidak tersedia.

## 6. Prinsip produk dan UX

1. **Agenda dulu:** informasi hari ini langsung terlihat di beranda.
2. **Tambah dengan cepat:** buat tugas atau jadwal dengan langkah sesedikit mungkin.
3. **Mudah dipindai:** informasi, status, dan tenggat memiliki hierarki visual yang jelas.
4. **Mobile-first:** fitur utama nyaman digunakan pada layar HP.
5. **Status transparan:** pengguna tahu apakah data tersimpan, file sedang diunggah, atau sinkronisasi tertunda.
6. **Aksesibilitas:** status tidak dibedakan hanya menggunakan warna.
7. **Tidak membuat fitur seolah berhasil:** aksi offline atau upload gagal harus ditampilkan secara jujur.

## 7. Ruang lingkup produk

### MVP — Must have

- Login untuk pemilik akun.
- Pengelolaan mata kuliah.
- Pengelolaan jadwal kuliah.
- Tampilan jadwal harian dan mingguan.
- Dashboard agenda hari ini.
- Pengelolaan tugas: status, prioritas, tenggat, dan mata kuliah.
- Upload, preview atau download, retry, dan hapus lampiran tugas.
- PWA dasar.
- Akses baca terhadap jadwal dan tugas terakhir yang tersinkron saat offline.
- Responsive layout dan status loading, error, serta empty state.

### MVP — Should have

- Kalender gabungan jadwal dan tenggat.
- Pengingat dalam aplikasi.
- Notifikasi browser ketika aplikasi terbuka dan izin pengguna diberikan.
- Pencarian atau filter dasar untuk tugas.

### Setelah MVP

- Impor dan ekspor kalender.
- Impor jadwal dari file.
- Checklist subtugas.
- Catatan per mata kuliah.
- Kolaborasi.
- Push notification ketika aplikasi ditutup.
- Integrasi LMS atau sistem akademik.

## 8. Navigasi dan halaman

### Navigasi desktop

Sidebar:

- Beranda
- Jadwal
- Tugas
- Kalender
- Mata Kuliah
- Pengaturan

Header halaman dapat menampilkan judul, tanggal, pencarian jika relevan, serta aksi utama.

### Navigasi mobile

Bottom navigation:

- Beranda
- Jadwal
- Tugas
- Kalender

Mata Kuliah dan Pengaturan dapat diletakkan di menu **Lainnya**. Aksi tambah harus mudah dijangkau dan tidak menutupi konten.

### Halaman utama

- `/login` — login pemilik akun.
- `/` — dashboard.
- `/schedule` — jadwal harian/mingguan.
- `/tasks` — daftar tugas.
- `/tasks/:id` — detail tugas dan lampiran.
- `/calendar` — kalender gabungan.
- `/courses` — daftar dan detail mata kuliah.
- `/settings` — preferensi aplikasi.

Akses ke halaman aplikasi selain login memerlukan autentikasi.

## 9. Fitur dan kebutuhan fungsional

### 9.1 Login

- Pemilik dapat login dengan email dan password.
- Pemilik dapat logout.
- Tidak ada pendaftaran publik pada MVP.
- Tidak ada reset password melalui email pada MVP.
- Pesan kegagalan login harus ramah dan tidak memaparkan error teknis.
- Aplikasi menampilkan halaman login jika sesi tidak tersedia atau sudah berakhir.

Akun pertama dibuat dan dikelola oleh pemilik melalui dashboard backend. Jangan membangun flow signup publik kecuali ruang lingkup produk berubah.

### 9.2 Dashboard

Tampilkan:

- Tanggal hari ini.
- Jumlah kelas hari ini.
- Jadwal hari ini dalam urutan waktu.
- Kelas berikutnya jika ada.
- Tugas yang paling dekat tenggatnya.
- Tugas terlambat yang belum selesai.
- Tombol cepat **Tambah Tugas** dan **Tambah Jadwal**.
- Status koneksi dan sinkronisasi bila relevan.

Perilaku:

- Jika belum ada jadwal, tampilkan empty state dan tautan ke halaman Jadwal.
- Jika belum ada tugas, tampilkan empty state dan tombol Tambah Tugas.
- Jika jadwal berikutnya tidak memiliki ruangan, tampilkan “Ruangan belum ditentukan”.
- Mengetuk agenda membuka detail jadwal atau tugas.
- Waktu mengikuti zona waktu perangkat.

### 9.3 Mata kuliah

Data mata kuliah:

- Nama — wajib.
- Kode mata kuliah — opsional.
- Dosen — opsional.
- Warna identitas — wajib, dari palet yang tersedia.
- Semester — opsional.
- Catatan — opsional.

Aksi:

- Tambah, lihat, ubah, dan hapus mata kuliah.
- Melihat tugas dan jadwal yang terhubung.
- Jika mata kuliah masih digunakan, sebelum menghapus tampilkan konfirmasi dan jelaskan dampaknya.
- Jangan menghapus jadwal atau tugas terkait secara diam-diam.

### 9.4 Jadwal kuliah

Data jadwal:

- Mata kuliah — wajib.
- Hari — wajib.
- Jam mulai — wajib.
- Jam selesai — wajib dan harus setelah jam mulai.
- Dosen — dapat mewarisi data mata kuliah atau diisi untuk sesi tertentu.
- Ruangan/lokasi — opsional.
- Tanggal mulai semester — opsional.
- Tanggal akhir semester — opsional.
- Catatan — opsional.

Fitur:

- Pengguna dapat menambahkan beberapa sesi untuk mata kuliah yang sama.
- Tampilan harian mengurutkan kelas berdasarkan waktu.
- Tampilan mingguan memperlihatkan agenda per hari.
- Pada layar HP, tampilan agenda daftar menjadi tampilan utama.
- Jadwal bertabrakan memunculkan peringatan sebelum disimpan; pengguna dapat memilih melanjutkan.
- Jadwal berulang tampil sesuai hari dan periode yang ditentukan.
- Jadwal dapat diberi warna mata kuliah dan tetap memakai label teks agar dapat dibedakan tanpa warna.

### 9.5 Task management

Data tugas:

- Judul — wajib.
- Deskripsi — opsional.
- Mata kuliah terkait — opsional.
- Tenggat tanggal — opsional.
- Tenggat waktu — opsional jika tanggal diisi.
- Prioritas — rendah, sedang, tinggi.
- Status — belum dikerjakan, sedang dikerjakan, selesai.
- Lampiran — opsional, maksimum 5 file.
- Pengingat — opsional.
- Waktu dibuat dan diubah — dibuat oleh sistem.
- Waktu selesai — opsional.

Aksi:

- Buat, lihat, ubah, hapus, dan tandai tugas selesai.
- Pengguna dapat membuka kembali tugas yang selesai.
- Filter tugas berdasarkan mata kuliah, status, prioritas, dan periode tenggat.
- Urutkan berdasarkan tenggat, prioritas, atau tanggal dibuat.
- Hapus tugas dengan konfirmasi, terutama jika memiliki lampiran.

Aturan:

- Tugas tanpa tenggat tidak dianggap terlambat.
- Tugas selesai tidak dianggap aktif atau terlambat.
- Tugas terlambat harus tampak berbeda dari tugas aktif biasa.
- Perubahan tugas memperbarui daftar dan dashboard.

### 9.6 Upload lampiran tugas

Tipe file yang diterima:

- Dokumen: PDF, DOC, DOCX.
- Presentasi: PPT, PPTX.
- Spreadsheet: XLS, XLSX, CSV.
- Gambar: JPG, JPEG, PNG, WEBP.
- Teks: TXT.

Batas aplikasi:

- Maksimum 5 file per tugas.
- Maksimum 20 MB per file.
- Tipe dan ukuran ditampilkan sebelum upload.
- File dengan format tidak didukung atau ukuran melebihi batas ditolak.
- ZIP, file executable, dan tipe lain yang tidak tercantum tidak diterima di MVP.

Perilaku upload:

1. Pengguna memilih file dari perangkat.
2. Sistem memvalidasi tipe, ukuran, dan jumlah lampiran.
3. Sistem menampilkan nama serta ukuran file yang dipilih.
4. Pengguna dapat membatalkan pilihan sebelum upload.
5. Setelah upload dimulai, tampilkan progres per file.
6. Hanya tandai file sukses setelah server mengonfirmasi penyimpanan.
7. Jika gagal, tampilkan penyebab yang bisa dipahami dan tombol **Coba lagi**.
8. Pengguna dapat membuka preview untuk format yang didukung atau mengunduh file.
9. Pengguna dapat menghapus lampiran dengan konfirmasi.
10. Upload memerlukan koneksi internet.
11. Jika upload gagal, data tugas tidak boleh hilang dan file tidak boleh ditampilkan seolah sudah tersimpan.

Validasi dan keamanan:

- Validasi dilakukan di browser dan server.
- Jangan hanya memercayai ekstensi file; gunakan pemeriksaan MIME/content type serta aturan server.
- Nama file dari pengguna hanya menjadi label tampilan; buat nama penyimpanan internal yang unik dan aman.
- File tidak boleh dijalankan sebagai kode di aplikasi.
- File harus privat dan hanya dapat diakses pemilik yang berwenang.
- Hapus objek storage ketika lampiran dihapus, dengan penanganan kegagalan yang jelas.

### 9.7 Kalender gabungan

Kalender menggabungkan:

- Jadwal kuliah.
- Tenggat tugas.
- Penanda tugas terlambat dan selesai jika relevan.

Sediakan tampilan bulanan, mingguan, dan harian. Pada HP, agenda daftar menjadi alternatif utama. Mengetuk item membuka detailnya.

### 9.8 Pengingat

MVP mendukung:

- Pengingat yang tampil di dalam aplikasi.
- Notifikasi browser hanya jika browser mendukung dan pengguna telah memberikan izin.
- Meminta izin hanya setelah pengguna mengaktifkan fitur pengingat.
- Pengaturan waktu pengingat sebelum kelas atau tenggat.
- Pengingat dapat dimatikan per item atau di pengaturan.

Jangan menjanjikan notifikasi ketika aplikasi ditutup pada MVP. Push notification terjadwal masuk fase lanjutan.

### 9.9 PWA dan offline

- Aplikasi tetap berfungsi sebagai web app biasa, walaupun tidak dipasang.
- Sediakan manifest, ikon, warna tema, dan service worker.
- Gunakan HTTPS pada deployment production.
- Cache app shell dan aset statis.
- Pengguna dapat membaca data jadwal dan tugas terakhir yang berhasil dimuat ketika offline.
- Tampilkan status offline dan waktu sinkronisasi terakhir.
- Upload dan download lampiran memerlukan koneksi.
- Jangan menampilkan perubahan lokal sebagai tersimpan di server sebelum konfirmasi.
- Jika ada perubahan lokal yang belum tersinkron, tampilkan statusnya secara eksplisit.
- Jangan cache seluruh file lampiran secara otomatis.
- Bersihkan cache pengguna saat logout atau pisahkan cache per user agar tidak tertukar di perangkat bersama.

### 9.10 Pengaturan

- Preferensi tema: terang, gelap, atau mengikuti sistem.
- Hari awal minggu.
- Preferensi pengingat.
- Zona waktu.
- Status koneksi/sinkronisasi.
- Tombol instalasi PWA jika didukung browser.
- Logout.

## 10. UI/UX dan visual design

### Arah visual

Modern, tenang, bersih, dan sedikit playful. Hindari dashboard yang terlalu padat, ornamen berlebihan, dan terlalu banyak warna aksen.

### Palet awal

| Fungsi | Warna |
|---|---|
| Latar utama | `#F7F8FA` |
| Surface/kartu | `#FFFFFF` |
| Teks utama | `#182230` |
| Teks sekunder | `#667085` |
| Aksen utama | `#4F46E5` |
| Aksen pendamping | `#14B8A6` |
| Prioritas tinggi/terlambat | `#DC5A5A` |
| Prioritas sedang | `#D28A26` |
| Prioritas rendah | `#4B8B68` |
| Border | `#E7EAF0` |

Warna status harus disertai teks atau ikon; jangan mengandalkan warna saja.

### Tipografi dan komponen

- Gunakan font sans-serif yang mudah dibaca, seperti Inter atau font sistem.
- Gunakan jarak dan ukuran radius yang konsisten.
- Kartu memakai border halus atau bayangan ringan.
- Tombol utama memiliki label yang jelas.
- Ikon harus konsisten dan tidak menggantikan label yang penting.
- Hindari informasi penting yang hanya muncul saat hover.

### Desktop

- Sidebar tetap di kiri.
- Area utama menampilkan judul dan konteks halaman.
- Dashboard menempatkan agenda dan daftar tugas secara seimbang.
- Gunakan ruang kosong untuk membantu pemindaian informasi.

### Mobile

- Bottom navigation untuk halaman inti.
- Gunakan daftar vertikal untuk agenda dan jadwal.
- Tombol dan target sentuh cukup besar.
- Jangan gunakan tabel jadwal yang memaksa scroll horizontal.
- Form satu kolom dan nyaman diisi.
- File picker menggunakan kontrol standar perangkat.

### Keadaan UI wajib

Semua halaman relevan perlu memiliki:

- Loading/skeleton.
- Empty state.
- Error state.
- Error validasi.
- Sukses tersimpan.
- Offline.
- Sinkronisasi tertunda.
- Upload berlangsung.
- Upload gagal dan retry.
- File tanpa preview.
- Konfirmasi penghapusan.
- Status tanpa izin notifikasi.

Error menjelaskan apa yang terjadi dan tindakan berikutnya. Jangan menampilkan stack trace atau pesan backend mentah.

## 11. Alur pengguna utama

### Membuat tugas dan mengunggah file

1. Pengguna memilih **Tambah Tugas**.
2. Pengguna mengisi judul, mata kuliah, tenggat, prioritas, dan deskripsi.
3. Pengguna memilih file.
4. Aplikasi memvalidasi tipe dan ukuran.
5. Aplikasi menampilkan file terpilih.
6. Pengguna menyimpan tugas.
7. Aplikasi menampilkan status simpan dan upload.
8. Setelah sukses, file terlihat di detail tugas dan dapat dibuka/diunduh.

### Membaca jadwal hari ini

1. Pengguna membuka dashboard.
2. Aplikasi menampilkan kelas hari ini menurut waktu.
3. Pengguna mengetuk kelas.
4. Detail menunjukkan mata kuliah, dosen, waktu, lokasi, dan catatan.

### Menyelesaikan tugas

1. Pengguna membuka Tugas.
2. Pengguna memakai filter atau urutan.
3. Pengguna membuka detail tugas.
4. Pengguna memeriksa deskripsi dan lampiran.
5. Pengguna mengubah status menjadi selesai.
6. Dashboard dan daftar tugas diperbarui.

### Akses offline

1. Koneksi terputus.
2. Aplikasi menampilkan status offline.
3. Pengguna membaca data terakhir yang berhasil tersinkron.
4. Upload/download dinonaktifkan atau dijelaskan membutuhkan koneksi.
5. Setelah koneksi pulih, aplikasi mencoba memuat ulang data dan menampilkan status hasil sinkronisasi.

## 12. Acceptance criteria

### Jadwal

- Pengguna dapat menyimpan jadwal dengan mata kuliah, hari, jam mulai, dan jam selesai.
- Sistem menolak jam selesai yang tidak lebih lambat dari jam mulai.
- Jadwal tampil pada waktu yang sesuai.
- Jadwal bentrok memunculkan peringatan sebelum disimpan.
- Tampilan HP tidak membutuhkan scroll horizontal yang tidak perlu.

### Tugas

- Judul wajib divalidasi.
- Tugas dengan tenggat dekat terlihat di dashboard.
- Tugas tanpa tenggat tidak ditandai terlambat.
- Tugas selesai tidak muncul sebagai tugas aktif.
- Pengguna dapat membuka kembali tugas selesai.

### Lampiran

- File yang diizinkan dan berada dalam batas ukuran dapat diunggah.
- Format salah atau file terlalu besar ditolak dengan pesan yang jelas.
- Nama, ukuran, dan progres file terlihat.
- File baru ditandai sukses setelah server mengonfirmasi.
- Upload gagal dapat diulang tanpa membuat tugas dari awal.
- Pengguna dapat mengunduh atau membuka file setelah berhasil.
- File tidak dapat diakses oleh pengguna yang tidak berhak.

### Responsive dan PWA

- Halaman berfungsi di mobile, tablet, dan desktop.
- Kontrol inti bisa digunakan dengan sentuhan dan keyboard.
- Web app tetap dapat digunakan tanpa instalasi PWA.
- Saat offline, aplikasi menandai status koneksi.
- Data yang belum tersinkron tidak diklaim sebagai data server yang tersimpan.

## 13. Tech stack

### Stack MVP yang ditetapkan

| Area | Teknologi | Kegunaan |
|---|---|---|
| Bahasa | TypeScript | Type safety |
| Frontend | React + Vite | SPA dan static build |
| Styling | Tailwind CSS | Design system dan responsive styling |
| Komponen | shadcn/ui + Radix UI | Komponen UI yang mudah dikustomisasi |
| Ikon | Lucide React | Ikon konsisten |
| Routing | React Router | Navigasi halaman |
| Server state | TanStack Query | Fetching, cache, dan invalidasi data |
| Form | React Hook Form + Zod | Form dan validasi |
| Backend | Supabase | Auth, PostgreSQL, Storage |
| PWA | `vite-plugin-pwa` / Workbox | Manifest dan service worker |
| Hosting frontend | Cloudflare Pages | Static hosting dan deployment |
| Version control | GitHub | Repositori dan riwayat perubahan |

Gunakan versi stabil terbaru yang kompatibel ketika implementasi dimulai. Simpan dependency di `package.json` dan commit lockfile.

### Target biaya

Target adalah tidak ada tagihan layanan bulanan selama akun dan penggunaan tetap di paket gratis. Ini bukan jaminan layanan gratis permanen atau tanpa batas.

- Supabase Free: gunakan kuota storage/database sebagai batas awal, bukan target penggunaan tanpa batas.
- Supabase Free dapat menjeda proyek yang tidak aktif; rencanakan kemungkinan perlu membuka dashboard untuk mengaktifkannya kembali.
- Supabase Free saat ini membatasi total file storage hingga 1 GB; batas produk 20 MB/file dan 5 file/tugas tetap berlaku.
- Cloudflare Pages digunakan hanya untuk frontend statis. Jangan gunakan folder deployment Pages sebagai penyimpanan file pengguna.
- Jangan mengaktifkan auto-upgrade atau layanan pay-as-you-go tanpa persetujuan.
- Pantau perubahan kuota dan harga sebelum deployment production.
- Domain yang sudah dimiliki tetap perlu diperpanjang melalui registrar sesuai kebijakan registrar.
- Claude Code adalah alat pengembangan terpisah; biaya atau kuotanya mengikuti akun/model yang dipakai.

### Alasan pemilihan

- Frontend React/Vite cocok untuk aplikasi personal yang mengonsumsi API backend.
- Hosting static mengurangi kebutuhan mengelola server sendiri.
- Supabase menyediakan database, auth, dan object storage dalam satu platform.
- Stack ini memiliki opsi penggunaan paket gratis, dengan batasan storage, idle, dan kuota yang harus dipahami.

## 14. Arsitektur dan keamanan backend

### Arsitektur

```text
Browser / PWA
  ├── React + TypeScript + Vite
  ├── Service worker / app shell
  └── Supabase JS client
        ├── Supabase Auth
        ├── Supabase PostgreSQL
        └── Supabase Storage (bucket privat)
```

### Environment variables

`.env.example` boleh berisi nama variabel tanpa nilai rahasia:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- `.env.local` wajib berada di `.gitignore`.
- Atur environment production melalui dashboard Cloudflare Pages.
- Jangan commit key atau password.
- Supabase service role key tidak boleh masuk frontend, repositori, screenshot, atau file konfigurasi publik.
- Publishable/anon key hanya boleh digunakan dengan kebijakan RLS yang benar.

### Database

Tabel inti:

- `courses`
- `class_sessions`
- `tasks`
- `task_attachments`

Persyaratan:

- Primary key UUID.
- Setiap data milik pengguna memiliki `user_id`.
- Foreign key memiliki aturan penghapusan yang jelas.
- Tabel yang dapat diubah mencatat `created_at` dan `updated_at`.
- Tenggat menyimpan waktu secara konsisten menggunakan timestamp dan zona waktu yang jelas.
- Skema diubah dengan SQL migrations yang dicatat dalam repositori.
- Tambahkan indeks untuk kolom yang digunakan untuk filter/join, seperti `user_id`, `course_id`, `status`, dan `due_at`.

### RLS

- Aktifkan Row Level Security untuk semua tabel yang memuat data pengguna.
- Pengguna hanya dapat membaca/membuat/mengubah/menghapus baris yang dimiliki.
- `user_id` ditentukan dari pengguna yang terautentikasi, bukan dipercaya dari UI.
- Akses ke data turunan harus memastikan pemilik data induknya sama.
- Uji akses memakai dua akun test.
- Jangan pernah membuat kebijakan akses terbuka untuk mempermudah development.

### Storage

- Bucket bernama `task-attachments` harus privat.
- Path objek: `user_id/task_id/attachment_uuid.ext`.
- Metadata file disimpan di tabel `task_attachments`; binary disimpan di Storage.
- Pengguna hanya dapat mengakses file yang terkait dengan task miliknya.
- Buat signed URL dengan masa berlaku terbatas jika diperlukan untuk preview atau download.
- Jangan menjadikan bucket publik.
- Kebijakan Storage harus mengatur operasi upload, read, dan delete secara terpisah sesuai kebutuhan.
- Hindari nama file asli sebagai nama objek penyimpanan.

## 15. Model data awal

### Course

- `id`: UUID.
- `user_id`: UUID pemilik.
- `name`: string wajib.
- `code`: string opsional.
- `instructor`: string opsional.
- `color`: string.
- `semester`: string opsional.
- `notes`: text opsional.
- `created_at`, `updated_at`.

### ClassSession

- `id`: UUID.
- `user_id`: UUID pemilik.
- `course_id`: UUID.
- `day_of_week`: integer/enum.
- `start_time`, `end_time`.
- `room`: string opsional.
- `start_date`, `end_date`: opsional.
- `notes`: text opsional.
- `created_at`, `updated_at`.

### Task

- `id`: UUID.
- `user_id`: UUID pemilik.
- `course_id`: UUID opsional.
- `title`: string wajib.
- `description`: text opsional.
- `due_at`: timestamp opsional.
- `priority`: enum rendah/sedang/tinggi.
- `status`: enum todo/in_progress/done.
- `reminder_at`: timestamp opsional.
- `completed_at`: timestamp opsional.
- `created_at`, `updated_at`.

### TaskAttachment

- `id`: UUID.
- `user_id`: UUID pemilik.
- `task_id`: UUID.
- `original_file_name`: label tampilan.
- `storage_key`: path internal.
- `content_type`: string.
- `size_bytes`: integer.
- `upload_status`: status upload.
- `created_at`, `uploaded_at`.

## 16. Offline dan sinkronisasi

### MVP

- Cache app shell dan aset statis.
- Simpan data baca terakhir yang berhasil diambil ke penyimpanan lokal sesuai kebutuhan.
- IndexedDB dapat digunakan untuk cache data terstruktur.
- Jangan cache lampiran penuh secara otomatis.
- Upload/download lampiran memerlukan internet.
- Tampilkan waktu sinkronisasi terakhir.
- Jika data lokal mungkin tertinggal, beri indikator bahwa data berasal dari cache.
- Bersihkan data cache saat logout atau pisahkan berdasarkan akun.
- MVP boleh bersifat baca-saja ketika offline.
- Jangan implementasikan antrean write offline yang kompleks pada MVP kecuali benar-benar dibutuhkan.

### Fase lanjutan

- Antrean perubahan offline.
- Konflik sinkronisasi multi-perangkat.
- Background upload.
- Push notifications saat aplikasi tertutup.

## 17. Keamanan file upload

- Validasi file di browser dan server.
- Periksa tipe file dan ukuran; jangan hanya memercayai ekstensi.
- Batasi format sesuai daftar yang diterima.
- Gunakan object path unik dan aman.
- Jangan render dokumen atau HTML yang tidak tepercaya sebagai halaman aktif.
- Gunakan bucket privat dan RLS pada Storage.
- File tidak boleh bisa diakses lintas pengguna.
- Jika penghapusan database berhasil tetapi penghapusan Storage gagal, catat status dan sediakan cara untuk menyelesaikan pembersihan; jangan menyembunyikan kegagalan.
- Jangan pernah menggunakan service role key pada client.

## 18. Kebutuhan nonfungsional

### Performa

- Dashboard dan daftar tugas terasa ringan.
- Tampilkan skeleton/loading saat data dimuat.
- Upload tidak boleh memblokir seluruh halaman.
- Progres upload ditampilkan per file.

### Aksesibilitas

- Input memiliki label.
- Navigasi keyboard berfungsi.
- Fokus keyboard terlihat.
- Error dikaitkan dengan field terkait.
- Status tidak dibedakan dengan warna saja.
- Teks dan kontrol mudah dibaca pada layar HP.
- Informasi penting tidak hanya muncul pada hover.

### Reliabilitas

- Tampilkan error saat simpan/upload gagal.
- Jangan mengklaim data tersimpan sebelum mendapat konfirmasi.
- Sediakan retry untuk operasi yang dapat diulang.
- Pertahankan data form jika validasi gagal.

## 19. Metrik keberhasilan

Kumpulkan metrik produk seperlunya tanpa menyimpan data sensitif yang tidak dibutuhkan.

- Pengguna berhasil memasukkan mata kuliah dan jadwal.
- Pengguna berhasil membuat tugas dengan tenggat.
- Tingkat keberhasilan upload.
- Waktu untuk membuat tugas.
- Pengguna dapat mengakses daftar tugas dari layar mobile.
- Frekuensi error upload dan sinkronisasi.
- Pengguna memahami status offline dan status file.

Tetapkan target angka setelah ada data penggunaan awal.

## 20. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Jadwal yang dimasukkan manual tidak akurat | Agenda salah | Form sederhana; pertimbangkan impor di fase berikutnya |
| Koneksi gagal saat upload | File tidak tersimpan | Progres, retry, dan status jelas |
| Pengguna melewati batas storage gratis | Upload berhenti atau berpotensi berbiaya | Batasi ukuran/jumlah dan pantau pemakaian |
| Proyek backend dijeda saat tidak aktif | Aplikasi perlu dibangunkan kembali | Dokumentasikan batas idle dan cara pemulihan |
| Dukungan PWA berbeda antar-browser | UX instalasi tidak sama | Pastikan web app biasa tetap berfungsi |
| Kesalahan RLS membuka data pengguna | Akses data tanpa izin | Migration teruji dan uji dua akun |
| Perubahan offline dianggap tersimpan | Data tidak sinkron | Tampilkan status offline/cache dan jangan mengklaim sukses |

## 21. Rencana rilis

### Tahap 1 — Fondasi

- Setup Vite, React, TypeScript, UI system, dan routing.
- Implementasikan layout responsive dan halaman dengan data contoh sementara.
- Pastikan lint/typecheck/build berjalan.

### Tahap 2 — Backend dan autentikasi

- Setup Supabase client.
- Buat migrations.
- Buat tabel, indeks, RLS, dan bucket privat.
- Implementasikan login/logout.
- Uji isolasi data.

### Tahap 3 — Fitur inti

- Mata kuliah.
- Jadwal kuliah.
- Tugas dan filter.
- Dashboard.
- Loading, error, dan empty states.

### Tahap 4 — Lampiran

- Upload, validasi, progres, retry, preview/download, dan delete.
- Uji format ditolak, file besar, koneksi gagal, dan akses lintas akun.

### Tahap 5 — PWA dan deployment

- Manifest, ikon, service worker, cache app shell, dan indikator offline.
- Deploy Cloudflare Pages.
- Hubungkan custom domain dengan hati-hati.
- Uji HTTPS, routing deep link, dan instalasi pada browser yang mendukung.

## 22. Deployment dan domain

### Cloudflare Pages

- Build command: `npm run build`.
- Output directory: `dist`.
- Hubungkan repositori GitHub ke Cloudflare Pages.
- Simpan environment variables di pengaturan project.
- Tambahkan SPA fallback agar deep link seperti `/tasks` tetap berfungsi.
- Gunakan HTTPS production.
- Pastikan caching tidak membuat versi aplikasi lama terus dipakai.
- Lampiran pengguna tetap berada di Supabase Storage, bukan di asset Pages.

### Custom domain

- Pengguna sudah memiliki domain dan menghubungkannya ke Pages.
- Subdomain seperti `app.example.com` dapat menggunakan record CNAME sesuai instruksi Cloudflare.
- Apex domain seperti `example.com` memerlukan pengelolaan domain sebagai Cloudflare zone dan konfigurasi nameserver sesuai persyaratan Cloudflare.
- Jangan mengubah nameserver tanpa mencatat konfigurasi DNS lama dan mendapat persetujuan pemilik.
- Uji domain Cloudflare bawaan terlebih dahulu sebelum mengubah domain utama.

### Biaya

- Tidak ada layanan berbayar yang menjadi syarat MVP berjalan.
- Jangan mengaktifkan fitur pay-as-you-go atau auto-upgrade.
- Jelaskan bahwa batas gratis dan kebijakan provider dapat berubah.
- Perpanjangan domain tetap tanggung jawab pemilik domain.
- Jika kuota habis, tampilkan error yang jelas; jangan diam-diam memicu pembelian paket.

## 23. Struktur folder yang disarankan

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  components/
    layout/
    shared/
    ui/
  features/
    auth/
    dashboard/
    courses/
    schedule/
    tasks/
    attachments/
    calendar/
    settings/
  hooks/
  lib/
    supabase/
      client.ts
    validation/
    utils/
  types/
  styles/
  main.tsx

public/
  icons/

supabase/
  migrations/
  seed.sql

.env.example
.gitignore
CLAUDE.md
README.md
package.json
```

Struktur boleh disesuaikan jika ada alasan teknis, tetapi pisahkan kode per domain fitur.

## 24. Definition of Done

Sebuah fitur dianggap selesai bila:

- Perilaku sesuai PRD.
- Tampilan mobile dan desktop diperiksa.
- Loading, empty, error, dan success states tersedia sesuai kebutuhan.
- Validasi client dan server berjalan untuk input relevan.
- Fitur backend memiliki RLS dan akses diuji.
- Tidak ada secret yang masuk repositori.
- Typecheck, lint, dan production build lulus.
- README/setup instructions diperbarui.
- Perubahan ditinjau sebelum deploy.

## 25. Instruksi implementasi untuk Claude Code

- Baca seluruh `prd.md` sebelum mengubah kode.
- Kerjakan satu tahap pada satu waktu.
- Jangan mengganti stack yang sudah ditetapkan tanpa menjelaskan alasan dan meminta persetujuan.
- Jangan hanya membuat mockup statis untuk fitur yang harus terhubung ke Supabase.
- Jangan membuat signup publik.
- Jangan menonaktifkan RLS untuk mempermudah.
- Jangan memasukkan service role key atau rahasia lain ke frontend.
- Jangan menambahkan layanan berbayar sebagai dependency wajib.
- Jangan mengubah DNS, melakukan deploy production, menjalankan operasi destruktif, atau menghapus data tanpa persetujuan eksplisit.
- Jika detail belum ditentukan, pilih solusi sederhana dan aman, dokumentasikan asumsi, lalu lanjutkan.
- Setelah setiap tahap, laporkan file yang diubah, cara menjalankan, hasil pengujian/build, dan pekerjaan yang belum selesai.
