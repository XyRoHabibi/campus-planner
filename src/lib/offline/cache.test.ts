import { QueryClient, dehydrate } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { CACHE_PREFIX, cacheKeyFor, dehydrateOptions, isPersistableQueryKey } from '@/lib/offline/cache'
import { queryKeys } from '@/lib/queryKeys'

describe('isPersistableQueryKey — whitelist ketat', () => {
  it('menyimpan daftar mata kuliah, jadwal, tugas, dan detail tugas', () => {
    expect(isPersistableQueryKey(queryKeys.courses)).toBe(true)
    expect(isPersistableQueryKey(queryKeys.sessions)).toBe(true)
    expect(isPersistableQueryKey(queryKeys.tasks)).toBe(true)
    expect(isPersistableQueryKey(queryKeys.task('11111111-1111-4111-8111-111111111111'))).toBe(true)
  })

  it('TIDAK menyimpan lampiran (metadata maupun hitungan), dampak hapus, atau query tak dikenal', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(isPersistableQueryKey(queryKeys.attachments(id))).toBe(false)
    expect(isPersistableQueryKey(queryKeys.taskAttachmentTotal(id))).toBe(false)
    expect(isPersistableQueryKey(queryKeys.courseImpact(id))).toBe(false)
    expect(isPersistableQueryKey(['attachment-preview', id])).toBe(false)
    expect(isPersistableQueryKey(['sesuatu-baru'])).toBe(false)
    expect(isPersistableQueryKey([])).toBe(false)
  })

  it('semua kunci query yang didefinisikan di queryKeys sudah dikategorikan dengan sengaja', () => {
    const id = 'x'
    const decisions: [readonly unknown[], boolean][] = [
      [queryKeys.courses, true], [queryKeys.sessions, true], [queryKeys.tasks, true], [queryKeys.task(id), true],
      [queryKeys.courseImpact(id), false], [queryKeys.attachments(id), false], [queryKeys.taskAttachmentTotal(id), false],
    ]
    for (const [key, expected] of decisions) expect(isPersistableQueryKey(key as never), JSON.stringify(key)).toBe(expected)
    // Gagal jika ada kunci baru di queryKeys: pembuatnya WAJIB memutuskan apakah datanya boleh disimpan offline.
    expect(decisions).toHaveLength(Object.keys(queryKeys).length)
  })
})

describe('dehydrate dengan opsi cache', () => {
  it('hanya query sukses yang ada di whitelist yang ikut tersimpan (isi data pribadi lain tidak bocor ke cache)', async () => {
    const qc = new QueryClient()
    const id = '11111111-1111-4111-8111-111111111111'
    qc.setQueryData(queryKeys.tasks, [{ id, title: 'Skripsi' }])
    qc.setQueryData(queryKeys.courses, [{ id: 'c', name: 'Basis Data' }])
    qc.setQueryData(queryKeys.attachments(id), [{ name: 'rahasia.pdf', storageKey: 'u/t/a.pdf' }])
    qc.setQueryData(queryKeys.taskAttachmentTotal(id), 3)
    qc.setQueryData(['attachment-preview', id], { url: 'https://signed.example/x?token=abc' })
    await qc.prefetchQuery({ queryKey: queryKeys.sessions, queryFn: () => Promise.reject(new Error('gagal')), retry: false })

    const state = dehydrate(qc, dehydrateOptions)
    const keys = state.queries.map((q) => JSON.stringify(q.queryKey)).sort()
    expect(keys).toEqual([JSON.stringify(['courses']), JSON.stringify(['tasks'])].sort())
    const serialized = JSON.stringify(state)
    expect(serialized).not.toContain('rahasia.pdf')
    expect(serialized).not.toContain('storageKey')
    expect(serialized).not.toContain('signed.example')
  })
})

describe('kunci cache per pengguna', () => {
  it('berbeda untuk tiap pengguna dan diawali prefix yang dipakai pembersihan', () => {
    expect(cacheKeyFor('user-a')).toBe(`${CACHE_PREFIX}user-a`)
    expect(cacheKeyFor('user-a')).not.toBe(cacheKeyFor('user-b'))
    expect(cacheKeyFor('user-a').startsWith(CACHE_PREFIX)).toBe(true)
  })
})
