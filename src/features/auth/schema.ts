import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').pipe(z.email('Format email tidak valid')),
  password: z.string().min(1, 'Password wajib diisi'),
})

export type LoginValues = z.infer<typeof loginSchema>
