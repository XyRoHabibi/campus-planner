import { describe, expect, it } from 'vitest'

import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_EXTENSIONS,
  FILE_TYPES,
  MAX_BYTES,
  extensionOf,
  formatBytes,
  newStorageKey,
  previewKindOf,
  sanitizeFileName,
  stageFiles,
  validateFile,
} from '@/features/attachments/validation'

const bytes = (...b: number[]) => new Uint8Array(b)
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))
const file = (name: string, content: Uint8Array | string, type = '') => new File([content as BlobPart], name, { type })

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13)
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0)
const OLE = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0)

describe('extensionOf & formatBytes', () => {
  it('mengambil ekstensi huruf kecil, kosong jika tidak ada', () => {
    expect(extensionOf('Laporan.FINAL.PDF')).toBe('pdf')
    expect(extensionOf('noext')).toBe('')
    expect(extensionOf('titik.')).toBe('')
    expect(extensionOf('.gitignore')).toBe('gitignore')
  })
  it('format ukuran', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20.0 MB')
  })
})

describe('validateFile — ekstensi & ukuran', () => {
  it('menerima semua 13 ekstensi dengan isi yang sesuai', async () => {
    const samples: Record<string, Uint8Array | string> = {
      pdf: '%PDF-1.4', doc: OLE, docx: ZIP, ppt: OLE, pptx: ZIP, xls: OLE, xlsx: ZIP, csv: 'a,b\n1,2', txt: 'halo',
      jpg: bytes(0xff, 0xd8, 0xff, 0xe0), jpeg: bytes(0xff, 0xd8, 0xff, 0xdb), png: PNG,
      webp: new Uint8Array([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP')]),
    }
    expect(Object.keys(samples).sort()).toEqual([...ALLOWED_EXTENSIONS].sort())
    for (const [ext, content] of Object.entries(samples)) {
      const r = await validateFile(file(`x.${ext}`, content))
      expect(r, ext).toMatchObject({ ok: true, ext, mime: FILE_TYPES[ext]?.mime })
    }
  })

  it('menolak format di luar daftar, termasuk yang berbahaya', async () => {
    for (const name of ['a.zip', 'a.exe', 'a.html', 'a.svg', 'a.js', 'a.sh', 'a.bat', 'a.rar', 'a.docm', 'a.php', 'a', 'a.']) {
      const r = await validateFile(file(name, 'x'))
      expect(r.ok, name).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/tidak (didukung|dikenali)/)
    }
  })

  it('pesan format menyebut ekstensi dan daftar yang diterima', async () => {
    const r = await validateFile(file('a.zip', 'x'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/\.zip tidak didukung.*PDF.*TXT/)
  })

  it('menolak file kosong dan file > 20 MB; tepat 20 MB diterima', async () => {
    const empty = await validateFile(file('a.txt', ''))
    expect(empty).toEqual({ ok: false, error: 'File kosong (0 byte).' })
    const big = new File([new Uint8Array(MAX_BYTES + 1)], 'big.txt')
    const r = await validateFile(big)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/melebihi batas 20\.0 MB/)
    expect((await validateFile(new File([new Uint8Array(MAX_BYTES).fill(65)], 'ok.txt'))).ok).toBe(true)
  })
})

describe('validateFile — isi file tidak boleh bertentangan dengan ekstensi', () => {
  it('menolak file yang diganti namanya', async () => {
    const cases: [string, Uint8Array | string][] = [
      ['fake.pdf', 'MZ\x90\x00 ini executable'], // exe dinamai .pdf
      ['fake.png', '%PDF-1.4'], // pdf dinamai .png
      ['fake.jpg', PNG],
      ['fake.docx', '%PDF-1.4'],
      ['fake.doc', ZIP], // zip dinamai .doc
      ['fake.xlsx', OLE], // OLE dinamai .xlsx
      ['fake.webp', new Uint8Array([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE')])], // RIFF tapi bukan WEBP
    ]
    for (const [name, content] of cases) {
      const r = await validateFile(file(name, content))
      expect(r.ok, name).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/Isi file tidak sesuai/)
    }
  })

  it('teks/CSV biner (ada byte NUL) ditolak; teks UTF-8 biasa diterima', async () => {
    expect((await validateFile(file('x.txt', bytes(0x61, 0, 0x62)))).ok).toBe(false)
    expect((await validateFile(file('x.csv', 'nama,nilai\nSiti,90\nBudi,85'))).ok).toBe(true)
    expect((await validateFile(file('x.txt', 'Catatan kuliah — bab 3 ✓'))).ok).toBe(true)
  })

  it('tidak memercayai MIME yang dilaporkan browser (type kosong atau menyesatkan)', async () => {
    expect((await validateFile(file('a.pdf', '%PDF-1.7', 'text/html'))).ok).toBe(true) // isi benar, type diabaikan
    expect((await validateFile(file('a.pdf', '<script>alert(1)</script>', 'application/pdf'))).ok).toBe(false) // type "benar", isi salah
  })

  it('HTML yang dinamai .txt lolos sebagai teks, tetapi tersimpan & disajikan sebagai text/plain (bukan halaman aktif)', async () => {
    const r = await validateFile(file('x.txt', '<html><script>alert(1)</script></html>'))
    expect(r).toMatchObject({ ok: true, mime: 'text/plain' })
  })
})

describe('stageFiles — batas jumlah', () => {
  it('file sah melebihi kuota ditolak dengan pesan batas; yang bermasalah tetap tampil', async () => {
    const files = [file('a.txt', 'a'), file('b.txt', 'b'), file('c.txt', 'c'), file('bad.zip', 'z')]
    const staged = await stageFiles(files, 2)
    expect(staged.map((s) => s.check.ok)).toEqual([true, true, false, false])
    const third = staged[2]?.check
    expect(third && !third.ok && third.error).toMatch(/Melebihi batas 5 file/)
    const fourth = staged[3]?.check
    expect(fourth && !fourth.ok && fourth.error).toMatch(/\.zip tidak didukung/)
    expect(new Set(staged.map((s) => s.localId)).size).toBe(4)
  })
  it('kuota 0 menolak semua file sah', async () => {
    const staged = await stageFiles([file('a.txt', 'a')], 0)
    expect(staged[0]?.check.ok).toBe(false)
  })
})

describe('sanitizeFileName & newStorageKey', () => {
  it('membuang pemisah path dan karakter kontrol; batas 255 mempertahankan ekstensi', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('.._.._etc_passwd')
    expect(sanitizeFileName('a\\b/c.pdf')).toBe('a_b_c.pdf')
    expect(sanitizeFileName('a\u0000b\u001f.txt')).toBe('a_b_.txt')
    expect(sanitizeFileName('   ')).toBe('file')
    const long = sanitizeFileName('x'.repeat(400) + '.pdf')
    expect(long).toHaveLength(255)
    expect(long.endsWith('.pdf')).toBe(true)
  })

  it('storage key persis sesuai constraint database dan tidak memuat nama file asli', () => {
    const u = crypto.randomUUID(), t = crypto.randomUUID(), a = crypto.randomUUID()
    const key = newStorageKey(u, t, a, 'pdf')
    expect(key).toBe(`${u}/${t}/${a}.pdf`)
    // Regex yang sama dengan CHECK task_attachments_storage_key_format di migration.
    expect(new RegExp(`^${u}/${t}/${a}\\.(pdf|doc|docx|ppt|pptx|xls|xlsx|csv|jpg|jpeg|png|webp|txt)$`).test(key)).toBe(true)
  })
})

describe('konsistensi dengan database (migration)', () => {
  // Dibaca lewat Vite (?raw) agar tidak perlu tipe Node di tsconfig aplikasi.
  const migrations = import.meta.glob('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const read = (f: string) => {
    const hit = Object.entries(migrations).find(([path]) => path.endsWith(`/${f}`))
    if (!hit) throw new Error(`migration ${f} tidak ditemukan`)
    return hit[1]
  }
  const mimesIn = (sql: string) => [...sql.matchAll(/'((?:application|text|image)\/[^']+)'/g)].map((m) => m[1] as string)

  it('whitelist MIME aplikasi identik dengan constraint tabel dan bucket', () => {
    const app = [...new Set(Object.values(FILE_TYPES).map((t) => t.mime))].sort()
    const schema = [...new Set(mimesIn(read('20261004000100_core_schema.sql')))].sort()
    const storage = [...new Set(mimesIn(read('20261004000300_storage.sql')))].sort()
    expect(app).toEqual(schema)
    expect(app).toEqual(storage)
  })

  it('daftar ekstensi aplikasi identik dengan regex storage_key di database', () => {
    const sql = read('20261004000100_core_schema.sql')
    const m = /\\\.\(([a-z|]+)\)\$/.exec(sql)
    expect(m).not.toBeNull()
    expect((m?.[1] ?? '').split('|').sort()).toEqual([...ALLOWED_EXTENSIONS].sort())
  })

  it('accept attribute memuat semua ekstensi; preview hanya untuk gambar/pdf/teks', () => {
    for (const e of ALLOWED_EXTENSIONS) expect(ACCEPT_ATTRIBUTE).toContain(`.${e}`)
    expect(previewKindOf('a.png')).toBe('image')
    expect(previewKindOf('a.pdf')).toBe('pdf')
    expect(previewKindOf('a.csv')).toBe('text')
    expect(previewKindOf('a.docx')).toBe('none')
    expect(previewKindOf('a.zip')).toBe('none')
  })
})
