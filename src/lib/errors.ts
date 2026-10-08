/** Error dengan pesan yang aman & ramah ditampilkan ke pengguna (tanpa detail teknis backend). */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export const GENERIC_ERROR_MESSAGE = 'Terjadi masalah saat memuat data. Silakan coba lagi.'

/** Pesan untuk UI; error tak dikenal tidak pernah menampilkan teks mentahnya. */
export function toUserMessage(error: unknown) {
  return error instanceof AppError ? error.message : GENERIC_ERROR_MESSAGE
}
