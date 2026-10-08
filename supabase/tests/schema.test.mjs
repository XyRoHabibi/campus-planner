// Tes skema + RLS tanpa kredensial dan tanpa Docker: menjalankan migration di PGlite (PostgreSQL in-memory)
// dengan stub minimal untuk schema `auth` dan `storage` milik Supabase.
//
//   npm run test:db
//
// Yang diuji: logika SQL kita (constraint, trigger, RLS, policy Storage). Yang TIDAK teruji di sini:
// layanan Supabase sungguhan (Auth/Storage API, batas ukuran & MIME bucket) — itu dicakup
// `supabase/tests/remote-rls.mjs` yang memakai dua akun test di project Supabase Anda.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const uuid = () => crypto.randomUUID()
const MIGRATIONS = new URL('../migrations/', import.meta.url)

let db

const STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id), name text, owner uuid);
  alter table storage.objects enable row level security;
  grant usage on schema auth, storage, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  grant select on storage.objects to anon; -- seperti Supabase: anon punya hak, RLS yang menyaring
  grant select on storage.buckets to authenticated;
  -- Meniru Supabase: tabel baru di schema public otomatis diberi hak ke anon & authenticated.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  insert into auth.users (id) values ('${A}'), ('${B}');
`

/** Menjalankan fn sebagai pengguna (role authenticated + JWT sub); `null` = anon. */
async function as(uid, fn) {
  await db.exec(
    uid === null
      ? 'set role anon; select set_config(\'request.jwt.claim.sub\', \'\', false)'
      : `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false)`,
  )
  try {
    return await fn(db)
  } finally {
    await db.exec('reset role')
  }
}

const rows = async (uid, sql, params) => (await as(uid, (d) => d.query(sql, params))).rows

const newCourse = async (uid, name = 'Matkul') =>
  (await rows(uid, "insert into courses (name, color) values ($1, '#4F46E5') returning id", [name]))[0].id

const newTask = async (uid, extra = {}) =>
  (
    await rows(uid, 'insert into tasks (title, course_id, status) values ($1, $2, $3) returning id', [
      'Tugas',
      extra.courseId ?? null,
      extra.status ?? 'todo',
    ])
  )[0].id

const keyFor = (uid, tid, id, ext = 'pdf') => `${uid}/${tid}/${id}.${ext}`

/** Insert lampiran pending yang valid; override via `o`. */
async function addAttachment(uid, tid, o = {}) {
  const id = o.id ?? uuid()
  const key = o.key ?? keyFor(uid, tid, id, o.ext ?? 'pdf')
  await as(uid, (d) =>
    d.query(
      `insert into task_attachments (id, task_id, original_file_name, storage_key, content_type, size_bytes${
        o.userId ? ', user_id' : ''
      }${o.status ? ', upload_status' : ''})
       values ($1, $2, $3, $4, $5, $6${o.userId ? ', $7' : ''}${o.status ? `, '${o.status}'` : ''})`,
      [id, tid, o.name ?? '../../etc/passwd.pdf', key, o.type ?? 'application/pdf', o.size ?? 1000, ...(o.userId ? [o.userId] : [])],
    ),
  )
  return { id, key }
}

/** Mensimulasikan upload ke Storage lewat policy INSERT (sebagai pengguna). */
const putObject = (uid, key) =>
  as(uid, (d) => d.query("insert into storage.objects (bucket_id, name) values ('task-attachments', $1)", [key]))

const setStatus = (uid, id, status) =>
  as(uid, (d) => d.query('update task_attachments set upload_status = $2 where id = $1', [id, status]))

before(async () => {
  db = new PGlite()
  await db.exec(STUB)
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'))
  }
})
after(async () => db.close())

describe('konfigurasi RLS', () => {
  it('RLS aktif di semua tabel data pengguna', async () => {
    const { rows: r } = await db.query(
      `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and relkind = 'r'`,
    )
    assert.equal(r.length, 4)
    for (const t of r) assert.equal(t.relrowsecurity, true, `RLS mati di ${t.relname}`)
  })

  it('setiap tabel punya policy select/insert/update/delete dan tidak ada untuk anon/public', async () => {
    const { rows: r } = await db.query(
      `select tablename, cmd, roles from pg_policies
       where schemaname in ('public') order by 1, 2`,
    )
    for (const t of ['courses', 'class_sessions', 'tasks', 'task_attachments']) {
      const cmds = r.filter((p) => p.tablename === t).map((p) => p.cmd).sort()
      assert.deepEqual(cmds, ['DELETE', 'INSERT', 'SELECT', 'UPDATE'], t)
    }
    for (const p of r) assert.deepEqual([...p.roles], ['authenticated'], `${p.tablename} ${p.cmd}`)
  })

  it('anon tidak bisa menyentuh data sama sekali', async () => {
    for (const t of ['courses', 'class_sessions', 'tasks', 'task_attachments']) {
      await assert.rejects(rows(null, `select * from ${t}`), /permission denied/, t)
    }
    await assert.rejects(
      rows(null, "insert into courses (name, color) values ('x', '#000000')"),
      /permission denied/,
    )
  })
})

describe('isolasi data antar pengguna', () => {
  it('B tidak bisa melihat, mengubah, atau menghapus mata kuliah/tugas/jadwal milik A', async () => {
    const c = await newCourse(A, 'Rahasia A')
    const t = await newTask(A, { courseId: c })
    const [s] = await rows(
      A,
      "insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, 1, '08:00', '09:00') returning id",
      [c],
    )

    for (const [table, id] of [['courses', c], ['tasks', t], ['class_sessions', s.id]]) {
      assert.equal((await rows(B, `select id from ${table} where id = $1`, [id])).length, 0, `${table} select`)
      assert.equal((await rows(B, `select id from ${table}`)).some((r) => r.id === id), false)
      assert.equal((await rows(B, `delete from ${table} where id = $1 returning id`, [id])).length, 0, `${table} delete`)
    }
    assert.equal((await rows(B, "update courses set name = 'dibajak' where id = $1 returning id", [c])).length, 0)
    assert.equal((await rows(B, "update tasks set title = 'dibajak' where id = $1 returning id", [t])).length, 0)

    // Data A utuh.
    assert.equal((await rows(A, 'select name from courses where id = $1', [c]))[0].name, 'Rahasia A')
  })

  it('user_id ditentukan server: default auth.uid(), nilai palsu ditolak', async () => {
    const [own] = await rows(A, "insert into courses (name, color) values ('x', '#111111') returning user_id")
    assert.equal(own.user_id, A)
    await assert.rejects(
      rows(B, `insert into courses (user_id, name, color) values ('${A}', 'spoof', '#111111')`),
      /row-level security/,
    )
    await assert.rejects(rows(B, `insert into tasks (user_id, title) values ('${A}', 'spoof')`), /row-level security/)
  })

  it('user_id tidak bisa dipindahkan lewat UPDATE', async () => {
    const c = await newCourse(A)
    await assert.rejects(rows(A, `update courses set user_id = '${B}' where id = $1`, [c]), /row-level security|tidak boleh diubah/)
  })

  it('data turunan tidak bisa menempel ke induk milik pengguna lain', async () => {
    const c = await newCourse(A)
    const t = await newTask(A)
    await assert.rejects(
      rows(B, 'insert into tasks (title, course_id) values ($1, $2)', ['x', c]),
      /foreign key/,
    )
    await assert.rejects(
      rows(B, "insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, 1, '08:00', '09:00')", [c]),
      /foreign key/,
    )
    await assert.rejects(addAttachment(B, t), /foreign key/)
    // Memindahkan tugas B sendiri ke course A juga ditolak.
    const tb = await newTask(B)
    await assert.rejects(rows(B, 'update tasks set course_id = $1 where id = $2', [c, tb]), /foreign key/)
  })
})

describe('aturan data', () => {
  it('validasi jam, hari, warna, dan judul', async () => {
    const c = await newCourse(A)
    const session = (day, s, e) =>
      rows(A, 'insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, $2, $3, $4)', [c, day, s, e])
    await assert.rejects(session(1, '09:00', '09:00'), /check/)
    await assert.rejects(session(1, '10:00', '09:00'), /check/)
    await assert.rejects(session(7, '08:00', '09:00'), /check/)
    await session(0, '08:00', '09:00') // valid
    await assert.rejects(rows(A, "insert into courses (name, color) values ('x', 'merah')"), /check/)
    await assert.rejects(rows(A, "insert into courses (name, color) values ('   ', '#000000')"), /check/)
    await assert.rejects(rows(A, "insert into tasks (title) values ('  ')"), /check/)
  })

  it('hapus mata kuliah: jadwal ikut terhapus, tugas dilepas tapi tidak hilang', async () => {
    const c = await newCourse(A)
    const t = await newTask(A, { courseId: c })
    await rows(A, "insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, 2, '08:00', '09:00')", [c])
    await rows(A, 'delete from courses where id = $1', [c])
    assert.equal((await rows(A, 'select id from class_sessions where course_id = $1', [c])).length, 0)
    const [task] = await rows(A, 'select course_id, user_id from tasks where id = $1', [t])
    assert.equal(task.course_id, null)
    assert.equal(task.user_id, A)
  })

  it('completed_at otomatis mengikuti status dan updated_at berubah saat update', async () => {
    const t = await newTask(A)
    assert.equal((await rows(A, 'select completed_at from tasks where id = $1', [t]))[0].completed_at, null)
    await rows(A, "update tasks set status = 'done' where id = $1", [t])
    const [done] = await rows(A, 'select completed_at, updated_at, created_at from tasks where id = $1', [t])
    assert.notEqual(done.completed_at, null)
    assert.ok(done.updated_at >= done.created_at)
    await rows(A, "update tasks set status = 'todo' where id = $1", [t])
    assert.equal((await rows(A, 'select completed_at from tasks where id = $1', [t]))[0].completed_at, null)
    // Tugas dibuat langsung "done" juga terisi.
    const t2 = await newTask(A, { status: 'done' })
    assert.notEqual((await rows(A, 'select completed_at from tasks where id = $1', [t2]))[0].completed_at, null)
  })
})

describe('lampiran: metadata', () => {
  it('menerima lampiran valid dan menyimpan nama asli hanya sebagai label', async () => {
    const t = await newTask(A)
    const { key } = await addAttachment(A, t, { name: 'Skripsi Final (revisi) .pdf' })
    const [r] = await rows(A, 'select storage_key, original_file_name, upload_status from task_attachments where task_id = $1', [t])
    assert.equal(r.storage_key, key)
    assert.equal(r.original_file_name, 'Skripsi Final (revisi) .pdf')
    assert.equal(r.upload_status, 'pending')
  })

  it('menolak storage_key yang menyimpang dari user_id/task_id/attachment_id.ext', async () => {
    const t = await newTask(A)
    const tOther = await newTask(A)
    const id = uuid()
    const bad = {
      'nama file asli': 'laporan.pdf',
      'tanpa ekstensi': `${A}/${t}/${id}`,
      'ekstensi terlarang (zip)': `${A}/${t}/${id}.zip`,
      'ekstensi terlarang (exe)': `${A}/${t}/${id}.exe`,
      'path traversal': `${A}/${t}/../${id}.pdf`,
      'task_id lain': `${A}/${tOther}/${id}.pdf`,
      'user_id lain': `${B}/${t}/${id}.pdf`,
      'id lampiran lain': `${A}/${t}/${uuid()}.pdf`,
      'ekstensi huruf besar': `${A}/${t}/${id}.PDF`,
      'titik sembarang': `${A}/${t}/${id}xpdf`,
    }
    for (const [label, key] of Object.entries(bad)) {
      await assert.rejects(addAttachment(A, t, { id, key }), /check|storage_key/, label)
    }
  })

  it('menolak content type di luar whitelist dan ukuran di luar batas', async () => {
    const t = await newTask(A)
    for (const type of ['application/zip', 'application/x-msdownload', 'text/html', 'image/svg+xml', 'application/javascript']) {
      await assert.rejects(addAttachment(A, t, { type }), /check/, type)
    }
    await assert.rejects(addAttachment(A, t, { size: 20 * 1024 * 1024 + 1 }), /check/)
    await assert.rejects(addAttachment(A, t, { size: 0 }), /check/)
    await addAttachment(A, t, { size: 20 * 1024 * 1024, ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) // tepat 20 MB
  })

  it('maksimum 5 lampiran per tugas diterapkan server', async () => {
    const t = await newTask(A)
    for (let i = 0; i < 5; i++) await addAttachment(A, t)
    await assert.rejects(addAttachment(A, t), /maksimal memiliki 5 lampiran/)
    // Tugas lain tidak terpengaruh.
    await addAttachment(A, await newTask(A))
  })

  it('lampiran baru tidak boleh langsung berstatus uploaded', async () => {
    const t = await newTask(A)
    await assert.rejects(addAttachment(A, t, { status: 'uploaded' }), /row-level security|pending/)
  })

  it('identitas lampiran tidak bisa diubah', async () => {
    const t = await newTask(A)
    const { id } = await addAttachment(A, t)
    await assert.rejects(rows(A, "update task_attachments set size_bytes = 5 where id = $1", [id]), /tidak boleh diubah/)
    await assert.rejects(rows(A, "update task_attachments set storage_key = 'x' where id = $1", [id]), /tidak boleh diubah/)
    await assert.rejects(rows(A, "update task_attachments set content_type = 'text/plain' where id = $1", [id]), /tidak boleh diubah/)
  })
})

describe('lampiran: siklus upload & Storage', () => {
  it('upload → konfirmasi → baca → hapus bersih, dan B tidak bisa ikut campur di tiap langkah', async () => {
    const t = await newTask(A)
    const { id, key } = await addAttachment(A, t)

    // Belum ada objek: tidak bisa ditandai uploaded (konfirmasi harus dari server).
    await assert.rejects(setStatus(A, id, 'uploaded'), /belum tersimpan/)

    // B tidak bisa mengunggah ke path milik A (tidak ada metadata milik B untuk key itu).
    await assert.rejects(putObject(B, key), /row-level security/)
    // Path tanpa metadata sah pun ditolak untuk A sendiri.
    await assert.rejects(putObject(A, keyFor(A, t, uuid())), /row-level security/)

    await putObject(A, key)
    // Sebelum "uploaded", objek belum bisa dibaca siapa pun lewat policy.
    assert.equal((await rows(A, 'select name from storage.objects where name = $1', [key])).length, 0)

    await setStatus(A, id, 'uploaded')
    const [att] = await rows(A, 'select upload_status, uploaded_at from task_attachments where id = $1', [id])
    assert.equal(att.upload_status, 'uploaded')
    assert.notEqual(att.uploaded_at, null)

    // A bisa membaca; B tidak (tidak terlihat sama sekali).
    assert.equal((await rows(A, 'select name from storage.objects where name = $1', [key])).length, 1)
    assert.equal((await rows(B, 'select name from storage.objects')).length, 0)
    assert.equal((await rows(B, 'select id from task_attachments where id = $1', [id])).length, 0)
    // Anon tidak bisa membaca objek.
    assert.equal((await rows(null, 'select name from storage.objects')).length, 0)

    // Objek tidak bisa ditimpa/diubah, dan tidak bisa dihapus selagi "uploaded".
    assert.equal((await rows(A, "update storage.objects set name = name || 'x' where name = $1 returning id", [key])).length, 0)
    assert.equal((await rows(A, 'delete from storage.objects where name = $1 returning id', [key])).length, 0)
    // B tidak bisa memaksa status lampiran A menjadi deleting lalu menghapus.
    assert.equal((await rows(B, "update task_attachments set upload_status = 'deleting' where id = $1 returning id", [id])).length, 0)
    assert.equal((await rows(B, 'delete from storage.objects where name = $1 returning id', [key])).length, 0)

    // Baris tidak bisa dihapus langsung dari "uploaded" (objek Storage harus dibersihkan lebih dulu).
    assert.equal((await rows(A, 'delete from task_attachments where id = $1 returning id', [id])).length, 0)

    // Hapus: deleting → objek dihapus → baris dihapus.
    await setStatus(A, id, 'deleting')
    assert.equal((await rows(A, 'delete from storage.objects where name = $1 returning id', [key])).length, 1)
    assert.equal((await rows(A, 'delete from task_attachments where id = $1 returning id', [id])).length, 1)
  })

  it('kegagalan pembersihan Storage terlihat (delete_failed) dan bisa diulang; transisi ilegal ditolak', async () => {
    const t = await newTask(A)
    const { id, key } = await addAttachment(A, t)
    await putObject(A, key)
    await setStatus(A, id, 'uploaded')
    await assert.rejects(setStatus(A, id, 'pending'), /tidak diizinkan/)
    await assert.rejects(setStatus(A, id, 'failed'), /tidak diizinkan/)
    await setStatus(A, id, 'deleting')
    await assert.rejects(setStatus(A, id, 'uploaded'), /tidak diizinkan/)
    await setStatus(A, id, 'delete_failed') // hapus objek gagal → baris dipertahankan
    assert.equal((await rows(A, 'delete from task_attachments where id = $1 returning id', [id])).length, 0)
    // Pembersihan ulang diperbolehkan.
    assert.equal((await rows(A, 'delete from storage.objects where name = $1 returning id', [key])).length, 1)
    await setStatus(A, id, 'deleting')
    assert.equal((await rows(A, 'delete from task_attachments where id = $1 returning id', [id])).length, 1)
  })

  it('upload gagal bisa diulang tanpa membuat tugas dari awal', async () => {
    const t = await newTask(A)
    const { id, key } = await addAttachment(A, t)
    await setStatus(A, id, 'failed')
    await setStatus(A, id, 'pending') // Coba lagi
    await putObject(A, key)
    await setStatus(A, id, 'uploaded')
    assert.equal((await rows(A, 'select upload_status from task_attachments where id = $1', [id]))[0].upload_status, 'uploaded')
    assert.equal((await rows(A, 'select id from tasks where id = $1', [t])).length, 1)
  })
})

describe('pengingat per item (Tahap 10)', () => {
  it('tasks.reminder_enabled default true; sesi jadwal juga; keduanya bisa dimatikan pemiliknya', async () => {
    const t = await newTask(A)
    assert.equal((await rows(A, 'select reminder_enabled from tasks where id = $1', [t]))[0].reminder_enabled, true)
    const c = await newCourse(A)
    const [s] = await rows(A, "insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, 1, '08:00', '09:00') returning id, reminder_enabled", [c])
    assert.equal(s.reminder_enabled, true)

    await rows(A, 'update tasks set reminder_enabled = false where id = $1', [t])
    await rows(A, 'update class_sessions set reminder_enabled = false where id = $1', [s.id])
    assert.equal((await rows(A, 'select reminder_enabled from tasks where id = $1', [t]))[0].reminder_enabled, false)
    assert.equal((await rows(A, 'select reminder_enabled from class_sessions where id = $1', [s.id]))[0].reminder_enabled, false)
  })

  it('kolom tidak boleh NULL dan pengguna lain tidak bisa mengubahnya', async () => {
    const t = await newTask(A)
    await assert.rejects(rows(A, 'update tasks set reminder_enabled = null where id = $1', [t]), /null value|not-null/)
    assert.equal((await rows(B, 'update tasks set reminder_enabled = false where id = $1 returning id', [t])).length, 0)
    assert.equal((await rows(A, 'select reminder_enabled from tasks where id = $1', [t]))[0].reminder_enabled, true)
  })

  it('baris lama (sebelum migration) otomatis memperoleh true — migration aditif', async () => {
    const { rows: col } = await db.query(
      `select column_default, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'tasks' and column_name = 'reminder_enabled'`,
    )
    assert.equal(col[0].column_default, 'true')
    assert.equal(col[0].is_nullable, 'NO')
  })
})

describe('bucket', () => {
  it('privat, 20 MB, dan whitelist MIME identik dengan constraint tabel', async () => {
    const [bucket] = (await db.query("select * from storage.buckets where id = 'task-attachments'")).rows
    assert.equal(bucket.public, false)
    assert.equal(Number(bucket.file_size_limit), 20 * 1024 * 1024)

    const { rows: c } = await db.query(
      `select pg_get_constraintdef(oid) def from pg_constraint
       where conrelid = 'public.task_attachments'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%content_type%'`,
    )
    const fromTable = [...c[0].def.matchAll(/'([a-z]+\/[^']+)'/g)].map((m) => m[1]).sort()
    assert.deepEqual([...bucket.allowed_mime_types].sort(), fromTable)
    for (const forbidden of ['application/zip', 'text/html', 'image/svg+xml', 'application/x-msdownload']) {
      assert.equal(bucket.allowed_mime_types.includes(forbidden), false, forbidden)
    }
  })

  it('migration idempotent untuk bucket: dijalankan ulang tetap privat', async () => {
    await db.exec("update storage.buckets set public = true where id = 'task-attachments'")
    await db.exec(
      readFileSync(new URL('20261004000300_storage.sql', MIGRATIONS), 'utf8').replaceAll(/create policy [\s\S]*?;\n\n?/g, ''),
    )
    assert.equal((await db.query("select public from storage.buckets where id = 'task-attachments'")).rows[0].public, false)
  })
})
