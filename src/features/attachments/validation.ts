/**
 * Validasi lampiran di browser (prd.md §9.6, §17). Server tetap penegak terakhir (CHECK constraint + bucket),
 * tetapi validasi di sini memberi pesan jelas SEBELUM upload dan menolak file yang isinya tidak sesuai ekstensi.
 * Daftar MIME wajib identik dengan constraint `task_attachments.content_type` dan bucket (dijaga oleh tes).
 */

export const MAX_FILES = 5
export const MAX_BYTES = 20 * 1024 * 1024

type Sniff = 'pdf' | 'png' | 'jpeg' | 'webp' | 'zip' | 'ole' | 'text'
export type PreviewKind = 'image' | 'pdf' | 'text' | 'none'

interface FileType {
  mime: string
  label: string
  sniff: Sniff
  preview: PreviewKind
}

/** Kunci = ekstensi huruf kecil. Format selain ini (ZIP, executable, SVG, HTML, dst.) tidak diterima. */
export const FILE_TYPES: Record<string, FileType> = {
  pdf: { mime: 'application/pdf', label: 'PDF', sniff: 'pdf', preview: 'pdf' },
  doc: { mime: 'application/msword', label: 'Word', sniff: 'ole', preview: 'none' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word', sniff: 'zip', preview: 'none' },
  ppt: { mime: 'application/vnd.ms-powerpoint', label: 'PowerPoint', sniff: 'ole', preview: 'none' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint', sniff: 'zip', preview: 'none' },
  xls: { mime: 'application/vnd.ms-excel', label: 'Excel', sniff: 'ole', preview: 'none' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel', sniff: 'zip', preview: 'none' },
  csv: { mime: 'text/csv', label: 'CSV', sniff: 'text', preview: 'text' },
  jpg: { mime: 'image/jpeg', label: 'Gambar JPEG', sniff: 'jpeg', preview: 'image' },
  jpeg: { mime: 'image/jpeg', label: 'Gambar JPEG', sniff: 'jpeg', preview: 'image' },
  png: { mime: 'image/png', label: 'Gambar PNG', sniff: 'png', preview: 'image' },
  webp: { mime: 'image/webp', label: 'Gambar WebP', sniff: 'webp', preview: 'image' },
  txt: { mime: 'text/plain', label: 'Teks', sniff: 'text', preview: 'text' },
}

export const ALLOWED_EXTENSIONS = Object.keys(FILE_TYPES)
/** Nilai atribut `accept` untuk <input type="file"> (hanya petunjuk UI; validasi sebenarnya di bawah). */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')
export const FORMAT_HELP = 'PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, JPG, PNG, WEBP, TXT'

export function extensionOf(name: string) {
  const i = name.lastIndexOf('.')
  return i < 0 || i === name.length - 1 ? '' : name.slice(i + 1).toLowerCase()
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function typeLabel(name: string) {
  return FILE_TYPES[extensionOf(name)]?.label ?? 'File'
}

/**
 * Nama dari pengguna hanya LABEL tampilan. Buang karakter kontrol & pemisah path, batasi 255 karakter
 * (sama dengan CHECK database) dengan mempertahankan ekstensi.
 */
export function sanitizeFileName(name: string) {
  // eslint-disable-next-line no-control-regex
  let clean = name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').trim()
  if (clean === '') clean = 'file'
  if (clean.length > 255) {
    const ext = extensionOf(clean)
    const keep = ext ? ext.length + 1 : 0
    clean = clean.slice(0, 255 - keep) + (keep ? clean.slice(-keep) : '')
  }
  return clean
}

/** Path objek Storage: `user_id/task_id/attachment_id.ext` — nama file asli TIDAK pernah dipakai (prd.md §14). */
export function newStorageKey(userId: string, taskId: string, attachmentId: string, ext: string) {
  return `${userId}/${taskId}/${attachmentId}.${ext}`
}

async function head(file: Blob, length = 12) {
  return new Uint8Array(await file.slice(0, length).arrayBuffer())
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((b, i) => bytes[offset + i] === b)
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

/** Apakah isi file cocok dengan jenis yang diklaim ekstensinya? Teks: tidak boleh memuat byte NUL (biner). */
export async function contentMatches(file: Blob, sniff: Sniff): Promise<boolean> {
  const b = await head(file)
  switch (sniff) {
    case 'pdf':
      return startsWith(b, ascii('%PDF-'))
    case 'png':
      return startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'jpeg':
      return startsWith(b, [0xff, 0xd8, 0xff])
    case 'webp':
      return startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8)
    case 'zip': // docx/pptx/xlsx adalah paket ZIP
      return startsWith(b, [0x50, 0x4b, 0x03, 0x04])
    case 'ole': // doc/ppt/xls lama (Compound File)
      return startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    case 'text': {
      const sample = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
      return !sample.includes(0)
    }
  }
}

export type FileCheck = { ok: true; ext: string; mime: string } | { ok: false; error: string }

/** Pemeriksaan satu file: ekstensi, ukuran, lalu isi. (Batas JUMLAH diperiksa terpisah oleh `stageFiles`.) */
export async function validateFile(file: File): Promise<FileCheck> {
  const ext = extensionOf(file.name)
  const type = FILE_TYPES[ext]
  if (!type) {
    return {
      ok: false,
      error: ext
        ? `Format .${ext} tidak didukung. Format yang diterima: ${FORMAT_HELP}.`
        : `Format file tidak dikenali. Format yang diterima: ${FORMAT_HELP}.`,
    }
  }
  if (file.size === 0) return { ok: false, error: 'File kosong (0 byte).' }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `Ukuran ${formatBytes(file.size)} melebihi batas ${formatBytes(MAX_BYTES)} per file.` }
  }
  if (!(await contentMatches(file, type.sniff))) {
    return { ok: false, error: `Isi file tidak sesuai dengan ekstensi .${ext}. File mungkin rusak atau diganti namanya.` }
  }
  return { ok: true, ext, mime: type.mime }
}

export interface StagedFile {
  /** ID lokal untuk React key & pembatalan pilihan. */
  localId: string
  file: File
  check: FileCheck
}

/**
 * Validasi daftar file yang dipilih. `slotsLeft` = sisa kuota (5 − lampiran yang sudah ada − yang sudah dipilih).
 * File sah yang melebihi kuota ditolak dengan pesan yang jelas; file bermasalah tetap ditampilkan agar penyebabnya terlihat.
 */
export async function stageFiles(files: File[], slotsLeft: number): Promise<StagedFile[]> {
  const staged: StagedFile[] = []
  let used = 0
  for (const file of files) {
    let check = await validateFile(file)
    if (check.ok) {
      if (used >= slotsLeft) {
        check = { ok: false, error: `Melebihi batas ${MAX_FILES} file per tugas.` }
      } else {
        used++
      }
    }
    staged.push({ localId: crypto.randomUUID(), file, check })
  }
  return staged
}

export function previewKindOf(name: string): PreviewKind {
  return FILE_TYPES[extensionOf(name)]?.preview ?? 'none'
}
