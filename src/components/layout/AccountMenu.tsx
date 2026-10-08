import { LoaderCircle, LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

/** Email akun + tombol Keluar. Dipakai di sidebar (desktop) dan menu "Lainnya" (mobile). */
export function AccountMenu() {
  const { user, signOut } = useAuth()
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    setPending(true)
    try {
      await signOut()
    } catch {
      toast.error('Belum bisa keluar', { description: 'Terjadi masalah. Silakan coba lagi.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      {user?.email && (
        <p className="truncate px-1 text-xs text-muted" title={user.email}>
          <span className="sr-only">Masuk sebagai </span>
          {user.email}
        </p>
      )}
      <Button variant="secondary" className="w-full justify-start" onClick={handleSignOut} disabled={pending}>
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <LogOut aria-hidden="true" />}
        {pending ? 'Keluar…' : 'Keluar'}
      </Button>
    </div>
  )
}
