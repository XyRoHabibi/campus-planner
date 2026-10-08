import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  UploadAbortedError,
  accessToken,
  deleteAttachment,
  markFailed,
  markUploaded,
  registerAttachment,
  resetToPending,
  uploadObject,
} from '@/features/attachments/api'
import { newStorageKey, sanitizeFileName, type StagedFile } from '@/features/attachments/validation'
import { useAuth } from '@/features/auth/auth-context'
import { toUserMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

export type UploadStatus = 'registering' | 'uploading' | 'confirming' | 'done' | 'failed'

export interface UploadItem {
  /** ID lampiran (UUID) — juga bagian dari nama objek di Storage. */
  id: string
  taskId: string
  file: File
  /** Label tampilan (sudah disanitasi). */
  name: string
  ext: string
  mime: string
  status: UploadStatus
  /** 0–100; 100 hanya setelah server mengonfirmasi penyimpanan. */
  progress: number
  error?: string
  /** Baris metadata sudah ada di server (menentukan retry vs daftar ulang). */
  registered: boolean
}

const ACTIVE: UploadStatus[] = ['registering', 'uploading', 'confirming']

/**
 * Antrean unggah multi-file dengan progres per file (prd.md §9.6).
 *  - Sebuah file ditandai "done" HANYA setelah server mengonfirmasi (objek ada + status uploaded).
 *  - Gagal → status "failed" dengan pesan yang bisa dipahami; "Coba lagi" memakai baris yang sama (tanpa membuat ulang tugas).
 *  - Batal / buang file gagal → baris & objek dibersihkan agar tidak memakan kuota 5 file.
 */
export function useUploadQueue() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [items, setItems] = useState<UploadItem[]>([])
  const aborts = useRef(new Map<string, () => void>())
  const cancelled = useRef(new Set<string>())
  const userId = user?.id

  const patch = useCallback((id: string, p: Partial<UploadItem>) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)))
  }, [])

  const refresh = useCallback((taskId: string) => qc.invalidateQueries({ queryKey: queryKeys.tasks }).then(() => taskId), [qc])

  /** Bersihkan baris + objek (upaya terbaik; jika objek gagal dihapus, baris `delete_failed` tetap terlihat di daftar). */
  const discard = useCallback(
    async (item: UploadItem, registered: boolean) => {
      aborts.current.delete(item.id)
      if (registered) {
        try {
          await deleteAttachment({ id: item.id, storageKey: newStorageKey(userId ?? '', item.taskId, item.id, item.ext) })
        } catch {
          /* delete_failed akan tampil di daftar lampiran */
        }
      }
      setItems((list) => list.filter((i) => i.id !== item.id))
      cancelled.current.delete(item.id)
      await refresh(item.taskId)
    },
    [refresh, userId],
  )

  const run = useCallback(
    async (item: UploadItem) => {
      let registered = item.registered
      try {
        if (!userId) throw new Error('no-user')
        patch(item.id, { status: 'registering', error: undefined, progress: 0 })
        if (registered) await resetToPending(item.id)
        else {
          await registerAttachment({
            id: item.id,
            taskId: item.taskId,
            name: item.name,
            storageKey: newStorageKey(userId, item.taskId, item.id, item.ext),
            contentType: item.mime,
            sizeBytes: item.file.size,
          })
          registered = true
          patch(item.id, { registered: true })
        }
        if (cancelled.current.has(item.id)) return void (await discard(item, registered))

        patch(item.id, { status: 'uploading' })
        const handle = uploadObject(newStorageKey(userId, item.taskId, item.id, item.ext), item.file, item.mime, await accessToken(), (progress) =>
          patch(item.id, { progress }),
        )
        aborts.current.set(item.id, handle.abort)
        await handle.promise
        aborts.current.delete(item.id)

        patch(item.id, { status: 'confirming', progress: 100 })
        await markUploaded(item.id) // trigger database memverifikasi objek benar-benar ada
        patch(item.id, { status: 'done' })
        await refresh(item.taskId)
      } catch (error) {
        aborts.current.delete(item.id)
        if (cancelled.current.has(item.id) || error instanceof UploadAbortedError) return void (await discard(item, registered))
        if (registered) void markFailed(item.id)
        patch(item.id, { status: 'failed', error: toUserMessage(error), registered, progress: 0 })
        void refresh(item.taskId) // daftar server menampilkan baris "failed" secara jujur
      }
    },
    [discard, patch, refresh, userId],
  )

  /** Mulai mengunggah file yang SUDAH lolos validasi ke tugas `taskId`. */
  const start = useCallback(
    (taskId: string, staged: StagedFile[]) => {
      const fresh: UploadItem[] = staged.flatMap((s) =>
        s.check.ok
          ? [{ id: crypto.randomUUID(), taskId, file: s.file, name: sanitizeFileName(s.file.name), ext: s.check.ext, mime: s.check.mime, status: 'registering' as const, progress: 0, registered: false }]
          : [],
      )
      setItems((list) => [...list, ...fresh])
      fresh.forEach((item) => void run(item))
    },
    [run],
  )

  const retry = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id)
      if (item && item.status === 'failed') void run(item)
    },
    [items, run],
  )

  /** Batalkan unggahan yang berjalan, atau buang file yang gagal. */
  const cancel = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      cancelled.current.add(id)
      const abort = aborts.current.get(id)
      if (abort) abort() // unggahan berjalan: `run` akan membersihkan lewat jalur abort
      else if (item.status === 'failed') void discard(item, item.registered)
      // status "registering": `run` memeriksa penanda batal setelah pendaftaran selesai
    },
    [discard, items],
  )

  const reset = useCallback(() => setItems((list) => list.filter((i) => ACTIVE.includes(i.status))), [])

  const busy = items.some((i) => ACTIVE.includes(i.status))

  // Cegah penutupan tab/penyegaran tidak sengaja saat unggahan masih berjalan.
  useEffect(() => {
    if (!busy) return
    const block = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', block)
    return () => window.removeEventListener('beforeunload', block)
  }, [busy])

  return { items, start, retry, cancel, reset, busy }
}
