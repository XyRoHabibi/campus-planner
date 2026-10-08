import { CircleAlert, Download, Eye, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { signedUrl } from '@/features/attachments/api'
import { AttachmentPreviewDialog } from '@/features/attachments/components/AttachmentPreviewDialog'
import { FileTypeIcon } from '@/features/attachments/components/FileTypeIcon'
import { useDeleteAttachment } from '@/features/attachments/hooks'
import { formatBytes, previewKindOf, typeLabel } from '@/features/attachments/validation'
import { toUserMessage } from '@/lib/errors'
import type { Attachment } from '@/types'

interface AttachmentListProps {
  attachments: Attachment[]
  online: boolean
}

/** Mulai unduhan lewat signed URL berumur singkat; nama file hanya dipakai sebagai label unduhan. */
async function startDownload(att: Attachment) {
  const url = await signedUrl(att.storageKey, att.name)
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function StatusBadge({ att }: { att: Attachment }) {
  switch (att.status) {
    case 'pending':
      return <Badge tone="warning">Belum selesai diunggah</Badge>
    case 'failed':
      return (
        <Badge tone="danger">
          <CircleAlert aria-hidden="true" />
          Gagal diunggah
        </Badge>
      )
    case 'deleting':
      return <Badge tone="warning">Penghapusan belum selesai</Badge>
    case 'delete_failed':
      return (
        <Badge tone="danger">
          <CircleAlert aria-hidden="true" />
          Gagal dihapus dari penyimpanan
        </Badge>
      )
    case 'uploaded':
      return null
  }
}

/** Daftar lampiran dari server. Hanya yang berstatus `uploaded` yang bisa dipratinjau/diunduh; sisanya ditandai jujur. */
export function AttachmentList({ attachments, online }: AttachmentListProps) {
  const [preview, setPreview] = useState<Attachment | null>(null)
  const [toDelete, setToDelete] = useState<Attachment | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const del = useDeleteAttachment()
  const offlineHint = online ? undefined : 'Perlu koneksi internet'

  const download = async (att: Attachment) => {
    setDownloadingId(att.id)
    try {
      await startDownload(att)
    } catch (error) {
      toast.error('Belum bisa mengunduh', { description: toUserMessage(error) })
    } finally {
      setDownloadingId(null)
    }
  }

  const confirmDelete = () => {
    if (!toDelete) return
    del.mutate(toDelete, {
      onSuccess: () => {
        toast.success('Lampiran dihapus', { description: toDelete.name })
        setToDelete(null)
      },
    })
  }

  return (
    <>
      <ul aria-label="Daftar lampiran" className="space-y-2">
        {attachments.map((att) => {
          const ready = att.status === 'uploaded'
          const canPreview = ready && previewKindOf(att.name) !== 'none'
          const cleanup = att.status === 'delete_failed' || att.status === 'deleting'
          return (
            <li key={att.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <div className="flex items-start gap-3">
                <FileTypeIcon name={att.name} className="mt-0.5 size-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  {/* Nama dari pengguna ditampilkan sebagai teks (React meng-escape), hanya label. */}
                  <p className="break-words font-medium">{att.name}</p>
                  <p className="text-xs text-muted">
                    {typeLabel(att.name)} · {formatBytes(att.sizeBytes)}
                    {ready && previewKindOf(att.name) === 'none' && ' · Tanpa pratinjau'}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge att={att} />
                  </div>
                  {att.status === 'failed' && <p className="mt-1.5 text-xs text-muted">Pilih file lagi untuk mengunggah ulang, atau hapus lampiran ini.</p>}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {canPreview && (
                  <Button size="sm" variant="secondary" onClick={() => setPreview(att)} disabled={!online} title={offlineHint}>
                    <Eye aria-hidden="true" />
                    Pratinjau
                  </Button>
                )}
                {ready && (
                  <Button size="sm" variant="secondary" onClick={() => void download(att)} disabled={!online || downloadingId === att.id} title={offlineHint}>
                    {downloadingId === att.id ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
                    Unduh
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    del.reset()
                    setToDelete(att)
                  }}
                  disabled={!online}
                  title={offlineHint}
                  aria-label={`${cleanup ? 'Coba bersihkan lagi' : 'Hapus'}: ${att.name}`}
                >
                  {cleanup ? <RotateCcw aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                  {cleanup ? 'Coba bersihkan lagi' : 'Hapus'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <AttachmentPreviewDialog attachment={preview} onClose={() => setPreview(null)} onDownload={(a) => void download(a)} downloading={downloadingId === preview?.id} online={online} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !del.isPending) setToDelete(null)
        }}
        title="Hapus lampiran?"
        confirmLabel="Hapus lampiran"
        pending={del.isPending}
        onConfirm={confirmDelete}
        description={
          <div className="space-y-2">
            <p>
              <strong className="break-words text-foreground">{toDelete?.name}</strong> akan dihapus permanen dari penyimpanan. Tugas dan lampiran lainnya tidak
              terpengaruh.
            </p>
            {del.isError && (
              <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-danger-fg">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{toUserMessage(del.error)}</span>
              </p>
            )}
          </div>
        }
      />
    </>
  )
}
