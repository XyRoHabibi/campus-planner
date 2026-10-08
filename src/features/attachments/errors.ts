/** Pesan upload yang bisa dipahami; pesan mentah Storage/jaringan tidak pernah ditampilkan (prd.md §9.6 langkah 7). */
export const UPLOAD_MESSAGES = {
  network: 'Koneksi terputus saat mengunggah. Periksa koneksi internet, lalu coba lagi.',
  tooLarge: 'Server menolak file ini karena ukurannya melebihi batas.',
  badType: 'Server menolak tipe file ini.',
  denied: 'Server menolak unggahan ini (izin). Muat ulang halaman, lalu coba lagi.',
  session: 'Sesi Anda mungkin telah berakhir. Muat ulang halaman atau masuk kembali.',
  generic: 'Unggahan gagal. Silakan coba lagi.',
} as const

export function uploadErrorMessage(status: number, body: string): string {
  if (status === 0) return UPLOAD_MESSAGES.network
  const text = body.toLowerCase()
  if (status === 413 || text.includes('exceeded the maximum allowed size') || text.includes('too large')) return UPLOAD_MESSAGES.tooLarge
  if (status === 415 || text.includes('mime type') || text.includes('not supported')) return UPLOAD_MESSAGES.badType
  if (status === 401) return UPLOAD_MESSAGES.session
  if (status === 403 || text.includes('row-level security') || text.includes('unauthorized')) return UPLOAD_MESSAGES.denied
  return UPLOAD_MESSAGES.generic
}
