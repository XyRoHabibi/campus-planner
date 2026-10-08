import { CalendarRange, Clock, MapPin, Pencil, StickyNote, Trash2, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { CourseTag } from '@/components/shared/CourseTag'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { useCourses } from '@/features/courses/hooks'
import { SessionFormDialog } from '@/features/schedule/components/SessionFormDialog'
import { useDeleteSession } from '@/features/schedule/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { DAY_NAMES, formatShortDate } from '@/lib/utils/dates'
import type { ClassSession } from '@/types'

type View = 'detail' | 'edit' | 'delete'

interface SessionDialogsProps {
  /** Sesi yang dibuka; `null` = semua dialog tertutup. */
  session: ClassSession | null
  onClose: () => void
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span aria-hidden="true" className="mt-0.5 text-muted [&_svg]:size-4">
        {icon}
      </span>
      <div>
        <dt className="font-semibold">{label}</dt>
        <dd className="mt-0.5 whitespace-pre-line text-muted">{children}</dd>
      </div>
    </div>
  )
}

const parseISODate = (iso: string) => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Detail sesi + alur ubah dan hapus. Dipakai di halaman Jadwal, Beranda, dan detail Mata Kuliah. */
export function SessionDialogs({ session, onClose }: SessionDialogsProps) {
  // Dipasang ulang per sesi (key) agar tampilan selalu mulai dari "detail".
  return session ? <SessionDialogsInner key={session.id} session={session} onClose={onClose} /> : null
}

function SessionDialogsInner({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const [view, setView] = useState<View>('detail')
  const online = useOnlineStatus()
  const courses = useCourses()
  const del = useDeleteSession()
  const course = courses.data?.find((c) => c.id === session.courseId)
  const instructor = session.instructor ?? course?.instructor
  const offlineHint = online ? undefined : 'Perlu koneksi internet'

  const period =
    session.startDate || session.endDate
      ? `${session.startDate ? formatShortDate(parseISODate(session.startDate)) : 'Tanpa batas awal'} – ${
          session.endDate ? formatShortDate(parseISODate(session.endDate)) : 'tanpa batas akhir'
        }`
      : 'Berlaku sepanjang waktu'

  const confirmDelete = () =>
    del.mutate(session.id, {
      onSuccess: () => {
        toast.success('Jadwal dihapus', { description: course?.name })
        onClose()
      },
    })

  return (
    <>
      <Modal
        open={view === 'detail'}
        onOpenChange={(open) => !open && onClose()}
        title={course?.name ?? 'Detail jadwal'}
        description={`${DAY_NAMES[session.dayOfWeek]}, ${session.startTime} – ${session.endTime}`}
      >
        <div className="space-y-4">
          <CourseTag course={course} />
          <dl className="space-y-3">
            <Detail icon={<Clock />} label="Waktu">
              {DAY_NAMES[session.dayOfWeek]}, {session.startTime} – {session.endTime}
            </Detail>
            <Detail icon={<MapPin />} label="Ruangan">
              {session.room ?? 'Ruangan belum ditentukan'}
            </Detail>
            <Detail icon={<User />} label="Dosen">
              {instructor ?? 'Belum diisi'}
              {session.instructor && course?.instructor && session.instructor !== course.instructor ? ' (khusus sesi ini)' : ''}
            </Detail>
            <Detail icon={<CalendarRange />} label="Periode">
              {period}
            </Detail>
            <Detail icon={<StickyNote />} label="Catatan">
              {session.notes ?? 'Belum ada catatan.'}
            </Detail>
          </dl>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setView('delete')} disabled={!online} title={offlineHint}>
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
            <Button onClick={() => setView('edit')} disabled={!online} title={offlineHint}>
              <Pencil aria-hidden="true" />
              Ubah
            </Button>
          </div>
        </div>
      </Modal>

      <SessionFormDialog open={view === 'edit'} onOpenChange={(open) => !open && onClose()} session={session} />

      <ConfirmDialog
        open={view === 'delete'}
        onOpenChange={(open) => {
          if (!open && !del.isPending) onClose()
        }}
        title="Hapus jadwal ini?"
        confirmLabel="Hapus jadwal"
        pending={del.isPending}
        onConfirm={confirmDelete}
        description={
          <div className="space-y-2">
            <p>
              Sesi <strong>{course?.name}</strong> hari {DAY_NAMES[session.dayOfWeek]} pukul {session.startTime}–
              {session.endTime} akan dihapus. Mata kuliah dan sesi lainnya tidak terpengaruh. Tindakan ini tidak dapat dibatalkan.
            </p>
            {del.isError && (
              <p role="alert" className="rounded-lg bg-danger-soft p-3 text-danger-fg">
                {toUserMessage(del.error)} Jadwal belum dihapus.
              </p>
            )}
          </div>
        }
      />
    </>
  )
}
