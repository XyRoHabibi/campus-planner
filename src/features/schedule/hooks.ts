import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createSession, deleteSession, fetchSessions, updateSession } from '@/features/schedule/api'
import type { SessionFormValues } from '@/features/schedule/schema'
import { queryKeys } from '@/lib/queryKeys'

export function useSessions() {
  return useQuery({ queryKey: queryKeys.sessions, queryFn: fetchSessions })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: SessionFormValues) => createSession(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  })
}

export function useUpdateSession(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: SessionFormValues) => updateSession(id, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  })
}
