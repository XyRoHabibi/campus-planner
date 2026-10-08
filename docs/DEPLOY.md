# Panduan deploy — Cloudflare Pages + Supabase

> Dokumen ini **menyiapkan** deploy; belum ada yang di-deploy. Sesuai `CLAUDE.md` dan `prd.md` §25, deploy production,
> perubahan DNS/nameserver, dan penghapusan data hanya dilakukan oleh pemilik dengan persetujuan eksplisit.
> Batas gratis dan kebijakan provider dapat berubah — cek dokumentasi resmi sebelum deploy.

## 0. Prasyarat (centang semuanya sebelum deploy)

- [ ] `npm run typecheck && npm run lint && npm test && npm run test:db && npm run build` lulus.
- [ ] Keempat migration di `supabase/migrations/` sudah diterapkan **berurutan** ke project Supabase production
      (`…100_core_schema`, `…200_rls`, `…300_storage`, `20261005000100_task_reminder_enabled`).
- [ ] `npm run test:remote` lulus penuh (85 pemeriksaan) terhadap project Supabase yang akan dipakai.
- [ ] Authentication → Providers → Email → **"Allow new users to sign up" dimatikan** (tidak ada pendaftaran publik).
- [ ] Akun pemilik dibuat manual (Authentication → Users). Akun uji A/B sebaiknya dihapus atau dipisah dari data nyata.
- [ ] Hanya **anon/publishable key** yang dipakai sebagai `VITE_SUPABASE_ANON_KEY`. Service-role/secret key tidak ada di
      repo, Cloudflare, ataupun screenshot (client menolak key semacam itu).
- [ ] Tidak ada fitur berbayar atau pay-as-you-go yang diaktifkan di Supabase maupun Cloudflare.

## 1. Repositori GitHub

Folder ini sudah `git init` tetapi **belum pernah di-commit**. Simulasi `git add .` (152 berkas) tidak memuat `.env*`
asli, `dist`, `node_modules`, JWT, key, maupun URL project Supabase — hanya `.env.example` (nama variabel tanpa nilai).

```bash
git add .
git status            # tinjau: tidak boleh ada .env / .env.local / .env.test.local
git commit -m "Campus Planner MVP"
git branch -M main
git remote add origin git@github.com:<akun>/<repo>.git
git push -u origin main
```

Repositori boleh dibuat **private**. Isinya tidak memuat rahasia; `VITE_*` pada dasarnya publik (masuk ke bundle).

## 2. Cloudflare Pages

Dashboard Cloudflare → Workers & Pages → Create → Pages → Connect to Git, pilih repositori.

| Pengaturan | Nilai |
|---|---|
| Framework preset | None (atau Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable `NODE_VERSION` | `22` |
| Environment variable `VITE_SUPABASE_URL` | URL project Supabase (Production **dan** Preview) |
| Environment variable `VITE_SUPABASE_ANON_KEY` | anon/publishable key (Production **dan** Preview) |

- **SPA fallback**: tidak memakai `_redirects` (aturan `/*  /index.html  200` ditolak Cloudflare sebagai loop tak terbatas pada Workers
  Static Assets). Di Workers, fallback diatur `wrangler.jsonc` (`not_found_handling: "single-page-application"`); di Pages, fallback
  otomatis selama tidak ada `404.html`. Deep link seperti `/tasks` tetap berfungsi.
- **Workers vs Pages**: bila proyek dibuat sebagai Workers, *Deploy command* `npx wrangler deploy` memakai `wrangler.jsonc` di repo
  (aset dari `dist`). `public/_headers` tetap berlaku di keduanya.
- **Header**: `public/_headers` mengatur (a) `index.html`, `sw.js`, `theme-init.js`, `manifest.webmanifest` **tidak di-cache lama**
  (agar versi lama tidak terus dipakai), (b) `/assets/*` ber-hash di-cache selamanya, dan (c) header keamanan:
  `Content-Security-Policy` (skrip hanya dari origin sendiri; koneksi hanya ke origin sendiri dan `*.supabase.co`),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
  Jika project Supabase memakai **custom domain**, tambahkan domain itu ke `connect-src` dan `img-src` di `_headers`.
  CSP diuji pada build produksi: 0 pelanggaran di alur normal, dan skrip inline serta koneksi ke domain asing terbukti diblokir.
- Lampiran pengguna **tetap di Supabase Storage**, bukan di aset Pages.
- Setiap push ke `main` memicu build produksi; branch lain mendapat URL Preview.

## 3. Konfigurasi Supabase untuk production

- Authentication → URL Configuration: isi **Site URL** dengan URL production (aplikasi tidak memakai tautan email,
  tetapi nilai ini sebaiknya benar) dan tambahkan URL Preview bila perlu.
- Pastikan RLS aktif di semua tabel (migration sudah mengaktifkannya; `test:remote` memeriksanya). **Jangan** mematikan RLS.
- Storage → bucket `task-attachments` harus **private** (dicek `test:remote`).
- Free plan **tidak** menyediakan backup terjadwal: ekspor database secara berkala (`pg_dump`/dashboard) jika datanya penting.

## 4. Domain kustom (opsional, lakukan terakhir)

1. **Uji dulu di domain bawaan** `https://<project>.pages.dev` sampai seluruh checklist di bagian 5 lulus.
2. **Subdomain** (mis. `app.contoh.id`): Pages → Custom domains → Set up a domain, lalu buat record **CNAME** ke
   `<project>.pages.dev` sesuai instruksi Cloudflare. Tidak perlu mengubah nameserver.
3. **Apex/root domain** (mis. `contoh.id`): memerlukan domain dikelola sebagai **zona Cloudflare** (ubah nameserver di registrar).
   **Catat dulu seluruh record DNS lama** (MX, TXT/SPF/DKIM, A/CNAME) dan pastikan semuanya disalin ke zona Cloudflare
   *sebelum* mengganti nameserver — kesalahan di sini dapat memutus email domain. Perubahan nameserver hanya dengan persetujuan pemilik.
4. Perpanjangan domain tetap tanggung jawab pemilik di registrar.

## 5. Checklist uji setelah deploy

Di URL production (HTTPS), idealnya di laptop **dan** HP:

- [ ] Halaman terbuka lewat **HTTPS**; buka langsung `/tasks`, `/calendar`, `/settings` lalu refresh — tidak 404.
- [ ] `curl -I https://<domain>/` memuat `content-security-policy`, `x-frame-options`, dan `cache-control: no-cache` untuk `/` dan `/sw.js`.
- [ ] Konsol browser bersih dari pelanggaran CSP; tidak ada request ke domain selain origin sendiri dan `*.supabase.co`.
- [ ] Login dengan akun pemilik, refresh (sesi bertahan), **Keluar** (kembali ke `/login`, deep link tidak menampilkan data).
- [ ] Buat mata kuliah → jadwal (coba satu yang bentrok) → tugas; tandai selesai & buka kembali; periksa Beranda dan Kalender.
- [ ] Lampiran: unggah PDF dan gambar, pratinjau, unduh, hapus; coba format tak didukung dan file > 20 MB (harus ditolak jelas).
- [ ] Pengaturan: ganti tema (bertahan setelah refresh), hari awal minggu, aktifkan pengingat; notifikasi browser hanya meminta
      izin setelah saklar diaktifkan.
- [ ] **PWA**: tombol "Instal aplikasi" muncul di Pengaturan (Chrome/Edge); aplikasi terpasang terbuka mandiri.
- [ ] **Offline**: setelah memuat data, aktifkan mode pesawat → aplikasi tetap terbuka, data terakhir terbaca, banner offline
      jujur, tombol ubah/unggah nonaktif; kembali online → data dimuat ulang.
- [ ] **Pembaruan versi**: deploy perubahan kecil → di tab yang sudah terbuka muncul "Versi baru tersedia" → **Muat ulang** memakai versi baru.
- [ ] Isolasi: login sebagai akun lain (atau jalankan `npm run test:remote` dengan akun uji) — data tidak tercampur;
      setelah logout, cache offline kosong (DevTools → Application → IndexedDB).
- [ ] Lighthouse (PWA, Accessibility) dan axe/WAVE pada halaman utama; perbaiki temuan serius.

## 6. Biaya dan kuota

- Target **$0/bulan** selama tetap di paket gratis dan dalam kuota; ini bukan jaminan permanen.
- **Supabase Free**: total storage file ±1 GB (batas produk 20 MB/file × 5 file/tugas tetap berlaku), ukuran database terbatas, dan
  project yang **tidak aktif cukup lama dapat dijeda** — buka dashboard Supabase untuk mengaktifkannya kembali (cek lamanya di
  dokumentasi terbaru). Jika kuota habis, aplikasi menampilkan error yang jelas; tidak ada pembelian otomatis.
- **Cloudflare Pages Free**: hosting statis; ada batas jumlah build per bulan. Jangan mengaktifkan add-on berbayar.
- Jangan mengaktifkan pay-as-you-go/auto-upgrade tanpa persetujuan. Pantau penggunaan di dashboard masing-masing sebelum dan sesudah deploy.

## 7. Rollback dan pemulihan

- **Frontend**: Cloudflare Pages → Deployments → pilih deployment sebelumnya → *Rollback*. Karena `sw.js`/`index.html` tidak di-cache lama,
  pengguna akan menerima pesan "Versi baru tersedia".
- **Database**: migration bersifat maju (tidak ada `down`). Perubahan skema berikutnya harus berupa migration baru yang aditif; jangan
  menjalankan perintah destruktif tanpa backup dan persetujuan.

## 8. Yang sengaja belum ada (setelah MVP, prd.md §7)

Impor/ekspor kalender, subtugas, catatan per mata kuliah, kolaborasi, push notification saat aplikasi ditutup, integrasi LMS/akademik,
antrean tulis offline, upload resumable, dan pemeriksaan isi file di server (butuh Edge Function).
