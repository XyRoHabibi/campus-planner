import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { deleteAttachment, fetchAttachments } from '@/features/attachments/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Attachment } from '@/types'

export function useAttachments(taskId: string) {
  return useQuery({ queryKey: queryKeys.attachments(taskId), queryFn: () => fetchAttachments(taskId) })
}

/** Menghapus lampiran lalu memuat ulang daftar & hitungan di semua tempat yang memakai prefix ['tasks']. */
export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (att: Pick<Attachment, 'id' | 'storageKey'>) => deleteAttachment(att),
    // Berhasil maupun gagal (delete_failed), status di server berubah → daftar harus dimuat ulang.
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.tasks }),
  })
}
