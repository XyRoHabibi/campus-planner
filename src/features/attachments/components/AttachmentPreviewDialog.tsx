import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink, FileQuestion, LoaderCircle } from 'lucide-react'

import { ErrorState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { TEXT_PREVIEW_LIMIT, fetchTextPreview, signedUrl } from '@/features/attachments/api'
import { formatBytes, previewKindOf } from '@/features/attachments/validation'
import { toUserMessage } from '@/lib/errors'
import type { Attachment } from '@/types'

type Media = { url: string } | { text: string; truncated: boolean }

interface AttachmentPreviewDialogProps {
  attachment: Attachment | null
  onClose: () => void
  onDownload: (att: Attachment) => void
  downloading: boolean
  online: boolean
}

/**
 * Pratinjau aman (prd.md §17): gambar lewat <img> dari signed URL (tidak bisa menjalankan skrip); teks/CSV ditampilkan
 * sebagai TEKS BIASA (bukan HTML); PDF dibuka di tab baru oleh peramban dari domain penyimpanan, bukan origin aplikasi.
 * Format lain tidak punya pratinjau, tetapi tetap bisa diunduh.
 */
export function AttachmentPreviewDialog({ attachment, onClose, onDownload, downloading, online }: AttachmentPreviewDialogProps) {
  const kind = attachment ? previewKindOf(attachment.name) : 'none'

  const media = useQuery({
    queryKey: ['attachment-preview', attachment?.id],
    queryFn: async (): Promise<Media> =>
      kind === 'text' ? await fetchTextPreview(attachment!.storageKey) : { url: await signedUrl(attachment!.storageKey) },
    enabled: attachment !== null && online && (kind === 'image' || kind === 'text' || kind === 'pdf'),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  return (
    <Modal
      open={attachment !== null}
      onOpenChange={(open) => !open && onClose()}
      title={attachment?.name ?? 'Pratinjau'}
      description={attachment ? `${formatBytes(attachment.sizeBytes)} · tautan pratinjau berlaku 1 menit` : undefined}
    >
      {attachment && (
        <div className="space-y-4">
          {!online ? (
            <p role="status" className="rounded-lg bg-warning-soft p-3 text-sm text-warning-fg">
              Pratinjau memerlukan koneksi internet. File tidak disimpan di perangkat ini.
            </p>
          ) : kind === 'none' ? (
            <div className="flex flex-col items-center py-6 text-center">
              <FileQuestion aria-hidden="true" className="mb-3 size-10 text-muted" />
              <p className="font-semibold">Pratinjau tidak tersedia</p>
              <p className="mt-1 max-w-xs text-sm text-muted">Format ini tidak dapat ditampilkan di aplikasi. Unduh file untuk membukanya.</p>
            </div>
          ) : media.isPending ? (
            <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Memuat pratinjau…
            </p>
          ) : media.isError ? (
            <ErrorState message={toUserMessage(media.error)} onRetry={() => void media.refetch()} retrying={media.isFetching} className="py-4" />
          ) : 'url' in media.data && kind === 'image' ? (
            <img
              src={media.data.url}
              alt={attachment.name}
              referrerPolicy="no-referrer"
              className="mx-auto max-h-[60dvh] max-w-full rounded-lg border border-border object-contain"
            />
          ) : 'url' in media.data ? (
            <div className="space-y-2 py-2 text-sm">
              <p className="text-muted">PDF dibuka di tab baru oleh peramban Anda.</p>
              <Button asChild>
                <a href={media.data.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Buka PDF di tab baru
                </a>
              </Button>
            </div>
          ) : (
            <div>
              {/* Teks biasa: React meng-escape isinya, jadi HTML/skrip di dalam file tidak pernah dijalankan. */}
              <pre className="max-h-[50dvh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-muted p-3 text-xs">
                {media.data.text}
              </pre>
              {media.data.truncated && (
                <p className="mt-2 text-xs text-muted">
                  Hanya {TEXT_PREVIEW_LIMIT.toLocaleString('id-ID')} karakter pertama yang ditampilkan. Unduh file untuk membaca selengkapnya.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
            <Button onClick={() => onDownload(attachment)} disabled={!online || downloading}>
              {downloading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
              Unduh
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
