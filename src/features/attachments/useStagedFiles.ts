import { useCallback, useMemo, useState } from 'react'

import { stageFiles, type StagedFile } from '@/features/attachments/validation'

/**
 * File yang sudah dipilih tetapi belum diunggah. Setiap file divalidasi (tipe, ukuran, isi, kuota) begitu dipilih,
 * dan pengguna bisa membatalkan pilihan sebelum upload dimulai (prd.md §9.6 langkah 2–4).
 */
export function useStagedFiles(slotsLeft: number) {
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [checking, setChecking] = useState(false)

  const validCount = useMemo(() => staged.filter((s) => s.check.ok).length, [staged])

  const add = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setChecking(true)
      try {
        const next = await stageFiles(files, slotsLeft - validCount)
        setStaged((list) => [...list, ...next])
      } finally {
        setChecking(false)
      }
    },
    [slotsLeft, validCount],
  )

  const remove = useCallback((localId: string) => setStaged((list) => list.filter((s) => s.localId !== localId)), [])
  const clear = useCallback(() => setStaged([]), [])

  return { staged, validCount, checking, add, remove, clear, slotsAvailable: Math.max(0, slotsLeft - validCount) }
}
