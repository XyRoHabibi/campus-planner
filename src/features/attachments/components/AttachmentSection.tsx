import { Paperclip, Upload, WifiOff } from 'lucide-react'

import { ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'
import { FilePickerButton, StagedFileList } from '@/features/attachments/components/FilePicker'
import { UploadQueueList } from '@/features/attachments/components/UploadQueueList'
import { useAttachments } from '@/features/attachments/hooks'
import { useStagedFiles } from '@/features/attachments/useStagedFiles'
import { useUploadQueue } from '@/features/attachments/useUploadQueue'
import { MAX_FILES } from '@/features/attachments/validation'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import type { Task } from '@/types'

/** Lampiran pada detail tugas: daftar, pilih file, progres per file, retry, pratinjau/unduh, hapus. */
export function AttachmentSection({ task }: { task: Task }) {
  const online = useOnlineStatus()
  const attachments = useAttachments(task.id)
  const queue = useUploadQueue()
  const gate = queryGate(attachments)

  const server = attachments.data ?? []
  const inQueue = new Set(queue.items.map((i) => i.id))
  // Baris yang sedang diurus antrean (termasuk yang gagal) ditampilkan di antrean, bukan dobel di daftar.
  const listed = server.filter((a) => !inQueue.has(a.id))
  // Kuota: baris di server + item antrean yang belum tercatat di server (mis. sedang didaftarkan).
  const serverIds = new Set(server.map((a) => a.id))
  const used = server.length + queue.items.filter((i) => !serverIds.has(i.id)).length
  const staged = useStagedFiles(MAX_FILES - used)

  const upload = () => {
    queue.start(task.id, staged.staged)
    staged.clear()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip aria-hidden="true" className="size-4" />
          Lampiran
        </CardTitle>
        <span className="text-sm tabular-nums text-muted" aria-label={`${used} dari ${MAX_FILES} lampiran`}>
          {used}/{MAX_FILES}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {!online && (
          <p role="status" className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-fg">
            <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Anda sedang offline. Unggah, pratinjau, unduh, dan hapus file memerlukan koneksi internet.
          </p>
        )}

        {gate.state === 'error' ? (
          <ErrorState message={toUserMessage(gate.error)} retrying={attachments.isFetching} onRetry={() => void attachments.refetch()} className="py-4" />
        ) : gate.state === 'offline' ? (
          <OfflineUnavailable
            title="Lampiran memerlukan koneksi"
            description="Daftar lampiran tidak disimpan di perangkat ini. Hubungkan ke internet untuk melihat dan mengelola file."
            className="py-4"
          />
        ) : gate.state === 'loading' ? (
          <div role="status" aria-label="Memuat lampiran" className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {listed.length === 0 && queue.items.length === 0 ? (
              <p className="text-sm text-muted">Belum ada lampiran.</p>
            ) : (
              <AttachmentList attachments={listed} online={online} />
            )}
            <UploadQueueList items={queue.items} onRetry={queue.retry} onCancel={queue.cancel} hideDone online={online} />
          </>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <StagedFileList staged={staged.staged} onRemove={staged.remove} />
          {staged.validCount > 0 && (
            <Button onClick={upload} disabled={!online}>
              <Upload aria-hidden="true" />
              Unggah {staged.validCount} file
            </Button>
          )}
          <FilePickerButton onFiles={(f) => void staged.add(f)} slotsAvailable={staged.slotsAvailable} checking={staged.checking} online={online} />
        </div>
      </CardContent>
    </Card>
  )
}
