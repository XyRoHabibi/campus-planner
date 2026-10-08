import { CircleAlert, CircleCheck, LoaderCircle, Paperclip, X } from 'lucide-react'
import { useId, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { FileTypeIcon } from '@/features/attachments/components/FileTypeIcon'
import {
  ACCEPT_ATTRIBUTE,
  FORMAT_HELP,
  MAX_BYTES,
  MAX_FILES,
  formatBytes,
  typeLabel,
  type StagedFile,
} from '@/features/attachments/validation'
import { cn } from '@/lib/utils/cn'

interface FilePickerButtonProps {
  onFiles: (files: File[]) => void
  /** Sisa kuota lampiran untuk tugas ini. */
  slotsAvailable: number
  checking: boolean
  online: boolean
  label?: string
}

/** Tombol pemilih file memakai kontrol standar perangkat (<input type="file">) — prd.md §10. */
export function FilePickerButton({ onFiles, slotsAvailable, checking, online, label = 'Pilih file' }: FilePickerButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  const helpId = useId()
  const full = slotsAvailable <= 0
  const disabledReason = !online
    ? 'Unggah file memerlukan koneksi internet.'
    : full
      ? `Batas ${MAX_FILES} file per tugas sudah tercapai.`
      : null

  return (
    <div>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = '' // izinkan memilih file yang sama lagi setelah dibatalkan
        }}
      />
      <Button variant="secondary" onClick={() => input.current?.click()} disabled={!online || full || checking} aria-describedby={helpId}>
        {checking ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Paperclip aria-hidden="true" />}
        {checking ? 'Memeriksa file…' : label}
      </Button>
      <p id={helpId} className="mt-2 text-xs text-muted">
        {disabledReason ?? `Maksimal ${MAX_FILES} file per tugas, ${formatBytes(MAX_BYTES).replace('.0', '')} per file.`} Format: {FORMAT_HELP}.
      </p>
    </div>
  )
}

/** Daftar file yang dipilih: nama, ukuran, jenis, hasil validasi, dan tombol batalkan pilihan. */
export function StagedFileList({ staged, onRemove }: { staged: StagedFile[]; onRemove: (localId: string) => void }) {
  if (staged.length === 0) return null
  return (
    <ul aria-label="File yang dipilih" className="space-y-2">
      {staged.map(({ localId, file, check }) => (
        <li
          key={localId}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-sm',
            check.ok ? 'border-border bg-surface' : 'border-danger/40 bg-danger-soft',
          )}
        >
          <FileTypeIcon name={file.name} className="mt-0.5 size-5 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium">{file.name}</p>
            <p className="text-xs text-muted">
              {typeLabel(file.name)} · {formatBytes(file.size)}
            </p>
            {check.ok ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success-fg">
                <CircleCheck aria-hidden="true" className="size-3.5" />
                Siap diunggah
              </p>
            ) : (
              <p role="alert" className="mt-1 flex items-start gap-1 text-xs font-medium text-danger-fg">
                <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                {check.error} File ini tidak akan diunggah.
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="-mr-1 -mt-1 size-10 shrink-0" onClick={() => onRemove(localId)} aria-label={`Batalkan pilihan ${file.name}`}>
            <X aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
