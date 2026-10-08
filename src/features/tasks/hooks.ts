import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTask,
  deleteTask,
  fetchTask,
  fetchTaskAttachmentTotal,
  fetchTasks,
  setTaskStatus,
  updateTask,
} from '@/features/tasks/api'
import type { TaskFormValues } from '@/features/tasks/schema'
import { queryKeys } from '@/lib/queryKeys'
import type { TaskStatus } from '@/types'

export function useTasks() {
  return useQuery({ queryKey: queryKeys.tasks, queryFn: fetchTasks })
}

export function useTask(id: string) {
  return useQuery({ queryKey: queryKeys.task(id), queryFn: () => fetchTask(id) })
}

/** Prefix ['tasks'] mencakup daftar, detail, dan hitungan di tempat lain (Beranda, Mata Kuliah). */
function useInvalidateTasks() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.tasks })
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({ mutationFn: (values: TaskFormValues) => createTask(values), onSuccess: invalidate })
}

export function useUpdateTask(id: string) {
  const invalidate = useInvalidateTasks()
  return useMutation({ mutationFn: (values: TaskFormValues) => updateTask(id, values), onSuccess: invalidate })
}

export function useSetTaskStatus() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => setTaskStatus(id, status),
    onSuccess: invalidate,
  })
}

/** Dihitung ulang tiap dialog hapus dibuka agar angka lampiran selalu segar. */
export function useTaskAttachmentTotal(taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.taskAttachmentTotal(taskId),
    queryFn: () => fetchTaskAttachmentTotal(taskId),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: async (_data, id) => {
      // Jangan me-refetch detail tugas yang baru dihapus (akan sempat tampil "tidak ditemukan"): buang cache-nya,
      // dan muat ulang hanya daftar.
      qc.removeQueries({ queryKey: queryKeys.task(id) })
      await qc.invalidateQueries({ queryKey: queryKeys.tasks, exact: true })
    },
  })
}
