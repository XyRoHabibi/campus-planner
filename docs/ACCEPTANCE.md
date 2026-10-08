# Audit acceptance criteria & Definition of Done

Jejak dari kriteria `prd.md` §12 dan §24 ke bukti pengujian. Status:
**✅ terbukti** (otomatis/terukur) · **🟡 sebagian** (ada bukti, ada catatan) · **⬜ belum diverifikasi** (perlu dicek pemilik/di perangkat nyata).

Sumber bukti:
- **U** = tes unit/komponen logika (`npm test`, 153 tes)
- **DB** = tes skema + RLS offline (`npm run test:db`, 24 tes)
- **R** = `npm run test:remote` terhadap project Supabase asli dengan dua akun (85 pemeriksaan, semuanya lulus)
- **UI** = diuji di browser Chromium (Edge) dengan backend ter-stub: layar HP 375px dan desktop 1280px
- **E2E** = diuji pada **build produksi** (service worker aktif; request Supabase dicegat, jaringan diputus untuk fase offline)

## PRD §12 — Acceptance criteria

### Jadwal
| Kriteria | Status | Bukti |
|---|---|---|
| Simpan jadwal dengan mata kuliah, hari, jam mulai & selesai | ✅ | R (buat/ubah sesi), UI, U (mapper) |
| Jam selesai yang tidak lebih lambat dari jam mulai ditolak | ✅ | U (Zod), DB + R (CHECK constraint), UI |
| Jadwal tampil pada waktu yang sesuai | ✅ | U (`HH:MM:SS` → `HH:mm`), R, UI |
| Jadwal bentrok memunculkan peringatan sebelum disimpan (boleh lanjut) | ✅ | U (`findConflicts`, 6 skenario), UI (peringatan tanpa POST; "Tetap simpan" baru menyimpan) |
| Tampilan HP tanpa scroll horizontal yang tidak perlu | ✅ | UI: `scrollWidth == clientWidth` di 375px pada semua halaman utama |

### Tugas
| Kriteria | Status | Bukti |
|---|---|---|
| Judul wajib divalidasi | ✅ | U (Zod), DB + R (CHECK), UI |
| Tugas bertenggat dekat terlihat di Beranda | ✅ | UI |
| Tugas tanpa tenggat tidak ditandai terlambat | ✅ | U (`isOverdue`), R (tersimpan `NULL`) |
| Tugas selesai tidak tampil sebagai aktif | ✅ | U, UI (tab Aktif/Selesai, hitungan) |
| Tugas selesai dapat dibuka kembali | ✅ | R (`completed_at` terisi lalu kosong otomatis), UI |

### Lampiran
| Kriteria | Status | Bukti |
|---|---|---|
| File yang diizinkan dan dalam batas dapat diunggah | ✅ | R (multipart ke Storage asli), UI |
| Format salah / file terlalu besar ditolak dengan pesan jelas | ✅ | U (13 ekstensi, ZIP/exe/html/svg ditolak, 0 byte, 20 MB tepat/lebih, isi tidak cocok ekstensi), R (CHECK + bucket), UI |
| Nama, ukuran, dan progres file terlihat | ✅ | UI (progres per file 0→75% → "Menunggu konfirmasi server") |
| File ditandai sukses hanya setelah server mengonfirmasi | ✅ | DB + R (trigger: `uploaded` ditolak jika objek tidak ada), UI (urutan POST → XHR → PATCH) |
| Upload gagal dapat diulang tanpa membuat tugas dari awal | ✅ | R (`failed → pending → upload → uploaded`), UI (satu register saja) |
| Dapat diunduh/dibuka setelah berhasil | ✅ | R (signed URL isinya sama, `Content-Disposition: attachment` untuk unduhan), UI (pratinjau gambar/teks/PDF) |
| File tidak dapat diakses pengguna yang tidak berhak | ✅ | R (akun B tidak bisa: upload ke path A, signed URL, download, daftar, hapus; anon tidak bisa; bucket tidak publik) |

### Responsif dan PWA
| Kriteria | Status | Bukti |
|---|---|---|
| Halaman berfungsi di mobile, tablet, dan desktop | ✅ (emulasi) | UI + E2E: 7 halaman × lebar 360/768/1024/1440px = 28 kombinasi, **0 overflow horizontal**, 0 pelanggaran CSP; navigasi berganti tepat di 768px (bottom nav di bawahnya, sidebar mulai 768px). Perangkat nyata belum diuji (lihat risiko #1) |
| Kontrol inti dapat dipakai dengan sentuhan dan keyboard | 🟡 | UI: target sentuh ≥ 44px di HP; grid kalender (roving tabindex + panah), dialog (Radix), form berlabel. Belum diaudit dengan screen reader |
| Web app tetap bisa dipakai tanpa instal PWA | ✅ | E2E (berjalan sebagai situs biasa; instal opsional) |
| Saat offline aplikasi menandai status koneksi | ✅ | E2E (banner + status "Offline · menampilkan data terakhir (dimuat hh:mm)"), UI |
| Data belum tersinkron tidak diklaim sebagai tersimpan | ✅ | Offline = baca-saja; mutasi tidak ditahan (`networkMode: 'always'`) dan gagal dengan jujur; tombol ubah/unggah nonaktif offline (E2E, UI) |

## PRD §24 — Definition of Done

| Butir | Status | Catatan |
|---|---|---|
| Perilaku sesuai PRD | ✅ | Seluruh "MVP — Must have" dan "Should have" (kalender, pengingat, notifikasi browser, filter) tersedia. Lihat "Di luar MVP" di bawah |
| Tampilan mobile dan desktop diperiksa | ✅ (emulasi) | Tangkapan layar dan pengukuran di 360/375px (HP), 768px (tablet), 1024–1440px (desktop), terang dan gelap; bukan perangkat nyata |
| Loading, empty, error, success state | ✅ | Ada di semua halaman data: skeleton, empty state, `ErrorState` + "Coba lagi", toast sukses, state offline ("Belum tersedia saat offline") |
| Validasi client **dan** server | ✅ | Zod di browser + CHECK/trigger/RLS/bucket di server (DB, R) |
| Fitur backend memiliki RLS dan akses diuji | ✅ | RLS aktif di 4 tabel + policy Storage; diuji dua akun di database asli (R) dan offline (DB) |
| Tidak ada secret di repositori | ✅ | Pindai berkas yang akan di-commit: 0 JWT/key/service-role/URL project; `.env`, `.env.local`, `.env.test.local` ter-ignore; client menolak key service-role |
| Typecheck, lint, production build lulus | ✅ | `npm run typecheck`, `npm run lint`, `npm run build` |
| README/instruksi setup diperbarui | ✅ | `README.md` + `docs/DEPLOY.md` |
| Perubahan ditinjau sebelum deploy | ⬜ | **Tugas pemilik.** Belum ada commit; tinjau `git status`/`git diff` dan checklist di `docs/DEPLOY.md` |

## Belum diverifikasi / risiko yang diketahui

Jujur tentang apa yang **tidak** dicakup bukti di atas — sebaiknya dicek sebelum atau segera setelah deploy:

1. **Browser & perangkat nyata**: semua uji UI memakai Chromium (Edge). Safari/iOS (termasuk PWA di iOS), Firefox, dan Chrome Android belum diuji.
2. **Aksesibilitas**: belum ada audit dengan screen reader maupun axe/Lighthouse. Dasar yang sudah ada: label pada input, error terkait field, status tidak hanya warna, fokus terlihat, dialog Radix, grid kalender dengan keyboard.
3. **Upload XHR ke Storage asli**: R membuktikan *endpoint dan permintaan multipart yang sama* lewat `fetch`; pemakaian `XMLHttpRequest` (untuk progres) diuji di browser dengan XHR palsu. Satu kali unggah nyata dari browser (file > beberapa MB, jaringan lambat) perlu dicoba manual.
4. **Notifikasi browser nyata**: alur izin diuji dengan `Notification` palsu; pengiriman notifikasi sungguhan (terutama Chrome Android lewat service worker) belum diuji.
5. **Pembaruan versi (toast "Versi baru tersedia")**: baru teramati bila dua versi pernah di-deploy; jalur kodenya belum dijalankan.
6. **Login lewat form dengan sandi asli**: R login dengan akun asli melalui supabase-js; form login diuji dengan kredensial salah dan validasi. Coba satu kali login/logout manual.
7. **Header produksi**: `_headers` (CSP, cache) diuji dengan server lokal yang menerapkan aturan yang sama, bukan pada Cloudflare Pages sendiri — verifikasi dengan `curl -I` setelah deploy.
8. **Batas kuota gratis**: perilaku saat kuota Supabase habis/ project dijeda tidak disimulasikan; yang ada hanya penanganan error umum yang ramah.

## Di luar MVP (sengaja belum ada, sesuai PRD §4 dan §7)

Impor/ekspor kalender, impor jadwal dari file, subtugas, catatan per mata kuliah, kolaborasi, push notification saat aplikasi ditutup,
integrasi LMS/akademik, antrean tulis offline, upload resumable, pemeriksaan isi file di server (Edge Function), dan override zona waktu
(zona waktu mengikuti perangkat, sesuai §9.2).
