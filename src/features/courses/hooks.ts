import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createCourse, deleteCourse, fetchCourseImpact, fetchCourses, updateCourse } from '@/features/courses/api'
import type { CourseFormValues } from '@/features/courses/schema'
import { queryKeys } from '@/lib/queryKeys'

export function useCourses() {
  return useQuery({ queryKey: queryKeys.courses, queryFn: fetchCourses })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CourseFormValues) => createCourse(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.courses }),
  })
}

export function useUpdateCourse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CourseFormValues) => updateCourse(id, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.courses }),
  })
}

/** Dihitung ulang tiap dialog dibuka agar angka dampak selalu segar. */
export function useCourseImpact(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.courseImpact(id),
    queryFn: () => fetchCourseImpact(id),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    // Jadwal ikut terhapus & tugas dilepas, jadi ketiganya perlu dimuat ulang.
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.courses }),
        qc.invalidateQueries({ queryKey: queryKeys.sessions }),
        qc.invalidateQueries({ queryKey: queryKeys.tasks }),
      ]),
  })
}
