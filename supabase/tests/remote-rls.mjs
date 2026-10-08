// Uji isolasi data & Storage terhadap project Supabase SUNGGUHAN dengan DUA akun test (prd.md §14 "RLS").
//
//   cp supabase/tests/remote-rls.env.example .env.test.local   # lalu isi nilainya (file ini di-ignore git)
//   npm run test:remote
//
// Syarat: migration sudah diterapkan, dan 2 akun test dibuat manual lewat dashboard Supabase
// (Authentication → Users). Gunakan akun KHUSUS test, bukan akun pemilik.
//
// Keamanan: hanya memakai anon/publishable key dan login pengguna — TIDAK PERNAH service-role key.
// Skrip hanya menghapus data yang ia buat sendiri (dilacak lewat id) dan selalu membersihkannya di akhir.
import { createClient } from '@supabase/supabase-js'

const env = (k) => {
  const v = process.env[k]
  if (!v) {
    console.error(`Env ${k} belum diisi (lihat .env.test.local).`)
    process.exit(2)
  }
  return v
}
const URL = env('VITE_SUPABASE_URL')
const KEY = env('VITE_SUPABASE_ANON_KEY')
if (/^sb_secret_/.test(KEY) || (KEY.split('.')[1] && JSON.parse(Buffer.from(KEY.split('.')[1], 'base64url').toString()).role === 'service_role')) {
  console.error('Key ini tampaknya service-role/secret. Jangan dipakai di sini — gunakan anon/publishable key.')
  process.exit(2)
}

const mk = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
async function login(prefix) {
  const c = mk()
  const { data, error } = await c.auth.signInWithPassword({ email: env(`${prefix}_EMAIL`), password: env(`${prefix}_PASSWORD`) })
  if (error) throw new Error(`Login ${prefix} gagal: ${error.message}`)
  return { c, id: data.user.id }
}

let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `  → ${detail}`}`)
  if (!ok) failed++
}
const MB = 1024 * 1024
const bytes = (n) => new Uint8Array(n).fill(65)

const anon = mk()
const A = await login('TEST_USER_A')
const B = await login('TEST_USER_B')
if (A.id === B.id) throw new Error('Akun A dan B harus berbeda.')

// Prasyarat: migration Tahap 10 harus sudah diterapkan (aplikasi membaca/menulis tasks.reminder_enabled).
// Dicek SEBELUM data apa pun dibuat, agar kegagalan jelas dan tidak menyisakan data uji.
{
  const pre = await A.c.from('tasks').select('reminder_enabled').limit(1)
  if (pre.error) {
    console.log('FAIL  PRASYARAT: kolom tasks.reminder_enabled tidak ada →', pre.error.message)
    console.log('\nTerapkan supabase/migrations/20261005000100_task_reminder_enabled.sql (SQL Editor atau `supabase db push`),')
    console.log('lalu jalankan ulang `npm run test:remote`. Tidak ada data uji yang dibuat.')
    process.exit(1)
  }
}

const created = { courseId: null, taskId: null, attachments: [] } // untuk cleanup
try {
  // 1. Anon tidak punya akses --------------------------------------------------
  {
    const r = await anon.from('courses').select('id')
    check(r.error !== null || (r.data ?? []).length === 0, 'anon tidak bisa membaca courses', JSON.stringify(r.data))
    const w = await anon.from('courses').insert({ name: 'x', color: '#000000' })
    check(w.error !== null, 'anon tidak bisa menulis courses')
  }

  // 2. A membuat data ----------------------------------------------------------
  const course = await A.c.from('courses').insert({ name: '[TEST] Isolasi', color: '#4F46E5' }).select().single()
  check(!course.error && course.data.user_id === A.id, 'user_id terisi otomatis dari sesi (A)', course.error?.message)
  created.courseId = course.data.id
  const task = await A.c.from('tasks').insert({ title: '[TEST] Tugas', course_id: created.courseId }).select().single()
  check(!task.error, 'A bisa membuat tugas', task.error?.message)
  created.taskId = task.data.id

  // 3. B tidak bisa melihat / mengubah / menghapus / menempel ke data A -------------
  check(((await B.c.from('courses').select('id').eq('id', created.courseId)).data ?? []).length === 0, 'B tidak melihat course A')
  check(((await B.c.from('tasks').select('id').eq('id', created.taskId)).data ?? []).length === 0, 'B tidak melihat tugas A')
  check(((await B.c.from('tasks').update({ title: 'dibajak' }).eq('id', created.taskId).select()).data ?? []).length === 0, 'B tidak bisa mengubah tugas A')
  check(((await B.c.from('tasks').delete().eq('id', created.taskId).select()).data ?? []).length === 0, 'B tidak bisa menghapus tugas A')
  check((await B.c.from('courses').insert({ user_id: A.id, name: 'spoof', color: '#000000' })).error !== null, 'B tidak bisa memalsukan user_id = A')
  check((await B.c.from('tasks').insert({ title: 'x', course_id: created.courseId })).error !== null, 'B tidak bisa membuat tugas di course A')
  check((await A.c.from('tasks').select('title').eq('id', created.taskId).single()).data?.title === '[TEST] Tugas', 'data A tetap utuh')

  // 4. Lampiran: metadata, upload, konfirmasi ----------------------------------
  const newAtt = async (client, userId, taskId, over = {}) => {
    const id = crypto.randomUUID()
    const key = over.key ?? `${userId}/${taskId}/${id}.txt`
    const r = await client.from('task_attachments').insert({
      id, task_id: taskId, original_file_name: over.name ?? 'catatan.txt', storage_key: key,
      content_type: over.type ?? 'text/plain', size_bytes: over.size ?? 5,
    })
    if (!r.error) created.attachments.push({ id, key })
    return { id, key, error: r.error }
  }
  const att = await newAtt(A.c, A.id, created.taskId)
  check(!att.error, 'A bisa mendaftarkan lampiran (pending)', att.error?.message)
  check((await newAtt(A.c, A.id, created.taskId, { key: `${A.id}/${created.taskId}/evil.txt` })).error !== null, 'storage_key dari nama file asli ditolak')
  check((await newAtt(A.c, A.id, created.taskId, { type: 'application/zip' })).error !== null, 'content type ZIP ditolak oleh database')
  check((await newAtt(A.c, A.id, created.taskId, { size: 21 * MB })).error !== null, 'ukuran > 20 MB ditolak oleh database')
  check((await newAtt(B.c, B.id, created.taskId)).error !== null, 'B tidak bisa menambah lampiran ke tugas A')

  const body = new Blob(['halo kampus'], { type: 'text/plain' })
  check((await B.c.storage.from('task-attachments').upload(att.key, body, { contentType: 'text/plain' })).error !== null, 'B tidak bisa upload ke path A')
  check((await A.c.storage.from('task-attachments').upload(`${A.id}/${created.taskId}/${crypto.randomUUID()}.txt`, body, { contentType: 'text/plain' })).error !== null, 'upload tanpa metadata terdaftar ditolak')
  check((await A.c.storage.from('task-attachments').upload(att.key, bytes(2 * MB), { contentType: 'application/zip' })).error !== null, 'bucket menolak MIME di luar whitelist')
  const up = await A.c.storage.from('task-attachments').upload(att.key, body, { contentType: 'text/plain' })
  check(!up.error, 'A berhasil upload ke path terdaftar', up.error?.message)

  const mark = await A.c.from('task_attachments').update({ upload_status: 'uploaded' }).eq('id', att.id).select().single()
  check(!mark.error && mark.data.upload_status === 'uploaded', 'status uploaded setelah objek ada', mark.error?.message)

  // 5. Akses file ---------------------------------------------------------------
  const signed = await A.c.storage.from('task-attachments').createSignedUrl(att.key, 60)
  check(!signed.error, 'A bisa membuat signed URL', signed.error?.message)
  if (signed.data) {
    const res = await fetch(signed.data.signedUrl)
    check(res.ok && (await res.text()) === 'halo kampus', 'signed URL mengembalikan isi file yang benar')
  }
  check((await B.c.storage.from('task-attachments').createSignedUrl(att.key, 60)).error !== null, 'B tidak bisa membuat signed URL untuk file A')
  check((await B.c.storage.from('task-attachments').download(att.key)).error !== null, 'B tidak bisa download file A')
  check((await anon.storage.from('task-attachments').download(att.key)).error !== null, 'anon tidak bisa download file A')
  const pub = await fetch(`${URL}/storage/v1/object/public/task-attachments/${att.key}`)
  check(!pub.ok, 'bucket tidak publik (URL publik ditolak)', `status ${pub.status}`)
  const rm = await B.c.storage.from('task-attachments').remove([att.key])
  check((rm.data ?? []).length === 0, 'B tidak bisa menghapus file A')
  check(((await B.c.storage.from('task-attachments').list(`${A.id}/${created.taskId}`)).data ?? []).length === 0, 'B tidak melihat daftar file A')

  // 6. Batas jumlah & ukuran ----------------------------------------------------
  for (let i = created.attachments.length; i < 5; i++) await newAtt(A.c, A.id, created.taskId)
  check((await newAtt(A.c, A.id, created.taskId)).error !== null, 'lampiran ke-6 ditolak')
  const big = await A.c.storage.from('task-attachments').upload(`${A.id}/${created.taskId}/${crypto.randomUUID()}.txt`, bytes(21 * MB), { contentType: 'text/plain' })
  check(big.error !== null, 'file > 20 MB ditolak (tidak lewat policy / batas bucket)')

  // 7. Query yang dipakai aplikasi (Tahap 4) -------------------------------------
  // Select string di bawah HARUS sama dengan konstanta COLUMNS di src/features/*/api.ts.
  const COURSE_COLS = 'id, name, code, instructor, color, semester, notes'
  const TASK_COLS = 'id, course_id, title, description, due_at, due_has_time, priority, status, reminder_at, completed_at, created_at, updated_at, reminder_enabled, task_attachments(count)'
  const SESSION_COLS = 'id, course_id, day_of_week, start_time, end_time, room, instructor, start_date, end_date, notes, reminder_enabled'

  const listed = await A.c.from('courses').select(COURSE_COLS).order('name', { ascending: true })
  check(!listed.error && listed.data.some((c) => c.id === created.courseId), 'app: daftar mata kuliah (kolom aplikasi) terbaca', listed.error?.message)

  const upd = await A.c.from('courses').update({ name: '[TEST] Diubah', code: null, notes: null }).eq('id', created.courseId).select(COURSE_COLS).single()
  check(!upd.error && upd.data.name === '[TEST] Diubah' && upd.data.code === null, 'app: ubah mata kuliah', upd.error?.message)

  const tl = await A.c.from('tasks').select(TASK_COLS).eq('task_attachments.upload_status', 'uploaded').order('created_at', { ascending: false })
  const mine = tl.data?.find((t) => t.id === created.taskId)
  check(!tl.error && mine !== undefined, 'app: daftar tugas dengan embed lampiran terbaca', tl.error?.message)
  check(mine?.task_attachments?.[0]?.count === 1, 'app: jumlah lampiran hanya menghitung yang uploaded (1 dari 5 baris)', JSON.stringify(mine?.task_attachments))
  const one = await A.c.from('tasks').select(TASK_COLS).eq('id', created.taskId).eq('task_attachments.upload_status', 'uploaded').maybeSingle()
  check(!one.error && one.data?.id === created.taskId, 'app: detail satu tugas', one.error?.message)
  const none = await A.c.from('tasks').select(TASK_COLS).eq('id', crypto.randomUUID()).maybeSingle()
  check(!none.error && none.data === null, 'app: tugas tak ada → null, bukan error', none.error?.message)

  // Dampak & cascade hapus mata kuliah (prd.md §9.3)
  const c2 = (await A.c.from('courses').insert({ name: '[TEST] Hapus', color: '#14B8A6' }).select().single()).data
  const s2 = await A.c.from('class_sessions').insert({ course_id: c2.id, day_of_week: 2, start_time: '08:00', end_time: '09:40' }).select(SESSION_COLS).single()
  check(!s2.error && s2.data.start_time === '08:00:00', 'app: sesi tersimpan; start_time kembali sebagai HH:MM:SS', s2.error?.message ?? s2.data?.start_time)
  const t2 = (await A.c.from('tasks').insert({ title: '[TEST] Tugas dilepas', course_id: c2.id }).select().single()).data
  created.extraTaskId = t2.id
  const impA = await Promise.all([
    A.c.from('class_sessions').select('id', { count: 'exact', head: true }).eq('course_id', c2.id),
    A.c.from('tasks').select('id', { count: 'exact', head: true }).eq('course_id', c2.id),
  ])
  check(impA[0].count === 1 && impA[1].count === 1, 'app: hitungan dampak (1 jadwal, 1 tugas)', `${impA[0].count}/${impA[1].count}`)
  const impB = await B.c.from('class_sessions').select('id', { count: 'exact', head: true }).eq('course_id', c2.id)
  check(impB.count === 0, 'B tidak bisa menghitung jadwal milik A')
  check(((await B.c.from('courses').delete().eq('id', c2.id).select('id')).data ?? []).length === 0, 'B tidak bisa menghapus mata kuliah A')

  const del = await A.c.from('courses').delete().eq('id', c2.id).select('id')
  check(!del.error && del.data.length === 1, 'app: A menghapus mata kuliah', del.error?.message)
  check(((await A.c.from('class_sessions').select('id').eq('course_id', c2.id)).data ?? []).length === 0, 'hapus mata kuliah → jadwalnya ikut terhapus (cascade)')
  const rel = await A.c.from('tasks').select('id, course_id').eq('id', t2.id).single()
  check(!rel.error && rel.data.course_id === null, 'hapus mata kuliah → tugas tetap ada, dilepas (course_id null)', rel.error?.message)

  // 8. Jadwal (Tahap 5): kolom & aturan yang dipakai aplikasi ----------------------
  const ins = (client, over = {}) =>
    client.from('class_sessions').insert({ course_id: created.courseId, day_of_week: 1, start_time: '08:00', end_time: '09:40', room: null, instructor: null, start_date: null, end_date: null, notes: null, ...over }).select(SESSION_COLS).single()
  const sA = await ins(A.c, { room: '[TEST] R1', start_date: '2026-08-01', end_date: '2026-12-20' })
  check(!sA.error && sA.data.end_date === '2026-12-20' && sA.data.end_time === '09:40:00', 'app: A membuat sesi jadwal (tanggal & jam kembali sesuai format mapper)', sA.error?.message)
  check(sA.data?.reminder_enabled === true, 'app: sesi baru punya reminder_enabled = true', JSON.stringify(sA.data?.reminder_enabled))
  const sU = await A.c.from('class_sessions').update({ course_id: created.courseId, day_of_week: 0, start_time: '10:00', end_time: '11:00', room: '[TEST] R2', instructor: null, start_date: null, end_date: null, notes: null }).eq('id', sA.data.id).select(SESSION_COLS).single()
  check(!sU.error && sU.data.day_of_week === 0 && sU.data.start_date === null, 'app: ubah sesi (hari Minggu = 0 tersimpan, periode dikosongkan)', sU.error?.message)
  check((await ins(A.c, { start_time: '09:00', end_time: '09:00' })).error !== null, 'jam selesai = jam mulai ditolak database')
  check((await ins(A.c, { start_time: '10:00', end_time: '09:00' })).error !== null, 'jam selesai < jam mulai ditolak database')
  check((await ins(A.c, { day_of_week: 7 })).error !== null, 'hari 7 ditolak database')
  check((await ins(A.c, { start_date: '2026-09-01', end_date: '2026-08-01' })).error !== null, 'tanggal akhir < tanggal mulai ditolak database')
  check((await ins(B.c)).error !== null, 'B tidak bisa membuat sesi di mata kuliah A')
  check(((await B.c.from('class_sessions').select('id').eq('id', sA.data.id)).data ?? []).length === 0, 'B tidak melihat sesi A')
  check(((await B.c.from('class_sessions').update({ room: 'dibajak' }).eq('id', sA.data.id).select('id')).data ?? []).length === 0, 'B tidak bisa mengubah sesi A')
  check(((await B.c.from('class_sessions').delete().eq('id', sA.data.id).select('id')).data ?? []).length === 0, 'B tidak bisa menghapus sesi A')
  const dS = await A.c.from('class_sessions').delete().eq('id', sA.data.id).select('id')
  check(!dS.error && dS.data.length === 1, 'app: A menghapus sesi', dS.error?.message)

  // 9. Tugas (Tahap 6): CRUD dengan kolom form, status, dan hapus + pembersihan Storage -----------
  const dueIso = new Date(2026, 9, 20, 10, 0).toISOString()
  const tc = await A.c.from('tasks').insert({ title: '[TEST] CRUD', description: null, course_id: created.courseId, due_at: dueIso, due_has_time: true, priority: 'high', status: 'todo' }).select(TASK_COLS).single()
  check(!tc.error && tc.data.due_has_time === true && new Date(tc.data.due_at).getTime() === new Date(dueIso).getTime(), 'app: buat tugas dengan tenggat berjam (timestamptz bolak-balik tanpa bergeser)', tc.error?.message)
  created.crudTaskId = tc.data.id
  check(tc.data.reminder_enabled === true, 'app: tugas baru punya reminder_enabled = true (MIGRATION 20261005000100 sudah diterapkan)', 'kolom reminder_enabled tidak ada/bukan true — terapkan migration Tahap 10')
  const muted = await A.c.from('tasks').update({ reminder_enabled: false }).eq('id', tc.data.id).select(TASK_COLS).single()
  check(!muted.error && muted.data.reminder_enabled === false, 'app: pengingat tugas bisa dimatikan per item', muted.error?.message)
  check(((await B.c.from('tasks').update({ reminder_enabled: true }).eq('id', tc.data.id).select('id')).data ?? []).length === 0, 'B tidak bisa mengubah reminder_enabled tugas A')
  const noDue = await A.c.from('tasks').insert({ title: '[TEST] Tanpa tenggat', due_at: null, due_has_time: false, priority: 'low', status: 'todo' }).select(TASK_COLS).single()
  created.noDueTaskId = noDue.data?.id
  check(!noDue.error && noDue.data.due_at === null && noDue.data.course_id === null, 'app: tugas tanpa tenggat & tanpa mata kuliah tersimpan sebagai NULL', noDue.error?.message)
  check((await A.c.from('tasks').insert({ title: '   ', priority: 'low', status: 'todo' })).error !== null, 'judul kosong/spasi ditolak database')
  const done = await A.c.from('tasks').update({ status: 'done' }).eq('id', tc.data.id).select(TASK_COLS).single()
  check(!done.error && done.data.status === 'done' && done.data.completed_at !== null, 'app: tandai selesai → completed_at terisi otomatis', done.error?.message)
  const reopen = await A.c.from('tasks').update({ status: 'todo' }).eq('id', tc.data.id).select(TASK_COLS).single()
  check(!reopen.error && reopen.data.status === 'todo' && reopen.data.completed_at === null, 'app: buka kembali → completed_at dikosongkan', reopen.error?.message)
  const edited = await A.c.from('tasks').update({ title: '[TEST] CRUD diubah', course_id: null, due_at: null, due_has_time: false }).eq('id', tc.data.id).select(TASK_COLS).single()
  check(!edited.error && edited.data.course_id === null && edited.data.due_at === null, 'app: ubah tugas (lepas mata kuliah & hapus tenggat)', edited.error?.message)
  check(((await B.c.from('tasks').update({ status: 'done' }).eq('id', tc.data.id).select('id')).data ?? []).length === 0, 'B tidak bisa mengubah status tugas A')

  // Hapus tugas + lampiran: alur persis seperti deleteTask() di aplikasi.
  const tDel = (await A.c.from('tasks').insert({ title: '[TEST] Hapus dengan lampiran', priority: 'low', status: 'todo' }).select('id').single()).data
  const delAtt = await newAtt(A.c, A.id, tDel.id)
  const delUp = await A.c.storage.from('task-attachments').upload(delAtt.key, new Blob(['isi'], { type: 'text/plain' }), { contentType: 'text/plain' })
  await A.c.from('task_attachments').update({ upload_status: 'uploaded' }).eq('id', delAtt.id)
  check(!delUp.error, 'persiapan: tugas dengan 1 lampiran terunggah', delUp.error?.message)
  const attRows = (await A.c.from('task_attachments').select('id, storage_key').eq('task_id', tDel.id)).data ?? []
  const markDeleting = await A.c.from('task_attachments').update({ upload_status: 'deleting' }).in('id', attRows.map((a) => a.id))
  const rmv = await A.c.storage.from('task-attachments').remove(attRows.map((a) => a.storage_key))
  check(!markDeleting.error && !rmv.error && (rmv.data ?? []).length === 1, 'app: lampiran ditandai deleting lalu objek Storage terhapus', markDeleting.error?.message ?? rmv.error?.message)
  const gone = await A.c.storage.from('task-attachments').list(`${A.id}/${tDel.id}`)
  check(!gone.error && (gone.data ?? []).length === 0, 'objek Storage benar-benar hilang sebelum tugas dihapus')
  const delT = await A.c.from('tasks').delete().eq('id', tDel.id).select('id')
  check(!delT.error && delT.data.length === 1, 'app: tugas dihapus setelah Storage bersih', delT.error?.message)
  check(((await A.c.from('task_attachments').select('id').eq('task_id', tDel.id)).data ?? []).length === 0, 'baris lampiran ikut terhapus (cascade), tidak ada metadata yatim')
  created.attachments = created.attachments.filter((a) => a.id !== delAtt.id) // sudah dibersihkan

  // 10. Lampiran (Tahap 8): jalur upload multipart seperti uploadObject() di aplikasi ----------------
  // (aplikasi memakai XHR agar ada progres; permintaannya identik: POST multipart ke endpoint Storage resmi + token pengguna)
  const attTask = (await A.c.from('tasks').insert({ title: '[TEST] Lampiran', priority: 'low', status: 'todo' }).select('id').single()).data
  created.attTaskId = attTask.id
  const tokenA = (await A.c.auth.getSession()).data.session.access_token
  const tokenB = (await B.c.auth.getSession()).data.session.access_token
  const multipart = (token, key, content, type, upsert = 'false') => {
    const fd = new FormData()
    fd.append('cacheControl', '3600')
    fd.append('', new Blob([content], { type }))
    return fetch(`${URL}/storage/v1/object/task-attachments/${key.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: KEY, 'x-upsert': upsert }, body: fd,
    })
  }
  const registerRow = async (id, ext, mime, size) => {
    const key = `${A.id}/${attTask.id}/${id}.${ext}`
    const r = await A.c.from('task_attachments').insert({ id, task_id: attTask.id, original_file_name: 'laporan akhir.' + ext, storage_key: key, content_type: mime, size_bytes: size })
    if (!r.error) created.attachments.push({ id, key })
    return { key, error: r.error }
  }

  const id1 = crypto.randomUUID()
  const r1 = await registerRow(id1, 'csv', 'text/csv', 7)
  check(!r1.error, 'app: baris lampiran pending terdaftar sebelum upload', r1.error?.message)
  check((await multipart(tokenB, r1.key, 'a,b\n1,2', 'text/csv')).ok === false, 'multipart: B tidak bisa upload ke path A')
  check((await multipart(tokenA, r1.key, 'PK-isi-zip', 'application/zip')).ok === false, 'multipart: MIME di luar whitelist ditolak bucket')
  const up1 = await multipart(tokenA, r1.key, 'a,b\n1,2', 'text/csv')
  check(up1.ok, 'multipart: A berhasil upload (XHR-equivalent) ke path terdaftar', `${up1.status} ${up1.ok ? '' : await up1.text()}`)
  check((await multipart(tokenA, r1.key, 'timpa', 'text/csv')).ok === false, 'multipart: x-upsert=false → objek yang sudah ada tidak bisa ditimpa')
  const conf = await A.c.from('task_attachments').update({ upload_status: 'uploaded' }).eq('id', id1).select('upload_status, uploaded_at').single()
  check(!conf.error && conf.data.upload_status === 'uploaded' && conf.data.uploaded_at !== null, 'app: status uploaded hanya setelah objek ada (uploaded_at terisi)', conf.error?.message)

  const dl = await A.c.storage.from('task-attachments').createSignedUrl(r1.key, 60, { download: 'laporan akhir.csv' })
  const dlRes = dl.data ? await fetch(dl.data.signedUrl) : null
  check(dlRes?.ok === true && (await dlRes.clone().text()) === 'a,b\n1,2', 'unduh: signed URL mengembalikan isi yang sama')
  check(/^text\/csv/.test(dlRes?.headers.get('content-type') ?? ''), 'content-type objek = tipe kanonis dari ekstensi (text/csv)', dlRes?.headers.get('content-type'))
  check(/attachment/i.test(dlRes?.headers.get('content-disposition') ?? ''), 'unduh: Content-Disposition attachment (tidak dirender di origin)', dlRes?.headers.get('content-disposition'))
  const previewUrl = (await A.c.storage.from('task-attachments').createSignedUrl(r1.key, 60)).data?.signedUrl
  const prevRes = previewUrl ? await fetch(previewUrl) : null
  check(prevRes?.ok === true && !/attachment/i.test(prevRes.headers.get('content-disposition') ?? ''), 'pratinjau: signed URL tanpa paksa-unduh, dari domain penyimpanan')

  // Retry tanpa membuat ulang: failed → pending → upload → uploaded
  const id2 = crypto.randomUUID()
  const r2 = await registerRow(id2, 'txt', 'text/plain', 4)
  const failedUpd = await A.c.from('task_attachments').update({ upload_status: 'failed' }).eq('id', id2)
  const again = await A.c.from('task_attachments').update({ upload_status: 'pending' }).eq('id', id2)
  const up2 = await multipart(tokenA, r2.key, 'halo', 'text/plain')
  const conf2 = await A.c.from('task_attachments').update({ upload_status: 'uploaded' }).eq('id', id2).select('upload_status').single()
  check(!failedUpd.error && !again.error && up2.ok && conf2.data?.upload_status === 'uploaded', 'retry: failed → pending → unggah ulang → uploaded tanpa membuat tugas/baris baru', `${failedUpd.error?.message ?? ''}${again.error?.message ?? ''}${up2.status}`)

  // Hapus lampiran (alur deleteAttachment di aplikasi)
  const del1 = await A.c.from('task_attachments').update({ upload_status: 'deleting' }).eq('id', id1)
  const rm1 = await A.c.storage.from('task-attachments').remove([r1.key])
  const row1 = await A.c.from('task_attachments').delete().eq('id', id1).eq('upload_status', 'deleting').select('id')
  const left1 = await A.c.storage.from('task-attachments').list(`${A.id}/${attTask.id}`)
  check(!del1.error && !rm1.error && row1.data?.length === 1 && !(left1.data ?? []).some((o) => r1.key.endsWith(o.name)), 'hapus lampiran: deleting → objek terhapus → baris terhapus')
  created.attachments = created.attachments.filter((a) => a.id !== id1)
  check((await A.c.from('task_attachments').delete().eq('id', id2).select('id')).data?.length === 0, 'baris berstatus uploaded tidak bisa dihapus langsung (harus lewat deleting)')
} catch (e) {
  failed++
  console.error('FAIL  skrip berhenti karena error tak terduga:', e.message)
} finally {
  // Cleanup: hanya data buatan skrip ini, memakai alur resmi (deleting → hapus objek → hapus baris).
  for (const a of created.attachments) {
    await A.c.from('task_attachments').update({ upload_status: 'deleting' }).eq('id', a.id)
    await A.c.storage.from('task-attachments').remove([a.key])
    await A.c.from('task_attachments').delete().eq('id', a.id)
  }
  // Verifikasi bahwa alur hapus lampiran benar-benar membersihkan objek Storage (bukan sekadar tanpa error).
  if (created.taskId && created.attachments.length) {
    const rest = await A.c.storage.from('task-attachments').list(`${A.id}/${created.taskId}`)
    check(!rest.error && (rest.data ?? []).length === 0, 'cleanup: objek Storage benar-benar terhapus lewat alur deleting', JSON.stringify(rest.data?.map((o) => o.name)))
  }
  if (created.taskId) await A.c.from('tasks').delete().eq('id', created.taskId)
  for (const extra of [created.extraTaskId, created.crudTaskId, created.noDueTaskId, created.attTaskId]) {
    if (extra) await A.c.from('tasks').delete().eq('id', extra)
  }
  if (created.courseId) await A.c.from('courses').delete().eq('id', created.courseId)
  const ids = [created.taskId, created.extraTaskId, created.crudTaskId, created.noDueTaskId, created.attTaskId].filter(Boolean)
  const left = ids.length ? (await A.c.from('tasks').select('id').in('id', ids)).data ?? [] : []
  console.log(left.length === 0 ? 'Cleanup: data uji dihapus.' : 'PERINGATAN: sebagian data uji tersisa — hapus manual item berawalan [TEST].')
}
console.log(failed === 0 ? '\nSemua pemeriksaan lulus.' : `\n${failed} pemeriksaan GAGAL.`)
process.exit(failed === 0 ? 0 : 1)
