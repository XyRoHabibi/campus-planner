import { Hammer, type LucideIcon } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/states'

interface PlaceholderPageProps {
  title: string
  description: string
  icon?: LucideIcon
  stage: number
}

/** Halaman kerangka untuk fitur yang dibangun di tahap berikutnya — jujur bahwa belum tersedia. */
export function PlaceholderPage({ title, description, icon = Hammer, stage }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-card border border-dashed border-border bg-surface">
        <EmptyState
          icon={icon}
          title="Segera hadir"
          description={`Halaman ini dikerjakan di Tahap ${stage}. Saat ini hanya kerangka navigasinya yang tersedia.`}
        />
      </div>
    </>
  )
}
