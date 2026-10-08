import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck2, CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TextField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { LOGIN_MESSAGES, sanitizeRedirect, toLoginErrorMessage } from '@/features/auth/errors'
import { loginSchema, type LoginValues } from '@/features/auth/schema'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Login pemilik akun. Tidak ada pendaftaran publik maupun reset password di MVP (prd.md §9.1). */
export function LoginPage() {
  const { status, configured, signIn } = useAuth()
  const location = useLocation()
  const online = useOnlineStatus()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  useEffect(() => {
    document.title = 'Masuk · Campus Planner'
  }, [])

  const redirectTo = sanitizeRedirect((location.state as { from?: unknown } | null)?.from)
  if (status === 'authenticated') return <Navigate to={redirectTo} replace />

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null)
    try {
      await signIn(email, password)
      // Navigasi terjadi otomatis lewat <Navigate> di atas saat status menjadi authenticated.
    } catch (error) {
      setServerError(toLoginErrorMessage(error, navigator.onLine))
      resetField('password') // email dipertahankan; hanya password dikosongkan
      setFocus('password')
    }
  })

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardContent className="sm:p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarCheck2 aria-hidden="true" className="size-6" />
            </div>
            <h1 className="text-xl font-bold">Masuk ke Campus Planner</h1>
            <p className="mt-1 text-sm text-muted">Jadwal, tugas, dan file kuliahmu di satu tempat.</p>
          </div>

          {!configured ? (
            <div role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger-fg">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{LOGIN_MESSAGES.notConfigured}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {!online && (
                <p role="status" className="rounded-lg bg-warning-soft p-3 text-sm text-warning-fg">
                  Anda sedang offline. Login memerlukan koneksi internet.
                </p>
              )}
              {serverError && (
                <div role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger-fg">
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}
              <TextField
                label="Email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                error={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={errors.password?.message}
                trailing={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 sm:size-9"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                }
                {...register('password')}
              />
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !online}>
                {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {isSubmitting ? 'Memeriksa…' : 'Masuk'}
              </Button>
            </form>
          )}
          <p className="mt-5 text-center text-xs text-muted">
            Akun dibuat oleh pemilik aplikasi. Tidak ada pendaftaran mandiri.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
