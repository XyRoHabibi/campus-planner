import { Compass } from 'lucide-react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Halaman tidak ditemukan" />
      <EmptyState
        icon={Compass}
        title="Halaman yang kamu cari tidak ada"
        description="Tautannya mungkin salah atau halamannya sudah dipindahkan."
        action={
          <Button asChild>
            <Link to="/">Kembali ke Beranda</Link>
          </Button>
        }
      />
    </>
  )
}
