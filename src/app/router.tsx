import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/layout/AppLayout'
import { RouteLoading } from '@/components/shared/RouteLoading'
import { RequireAuth } from '@/features/auth/RequireAuth'

/**
 * Halaman dimuat per rute (code splitting) agar bundle awal kecil. Kerangka (AppLayout, RequireAuth) tetap statis.
 * Semua chunk ikut di-precache oleh service worker sehingga navigasi tetap jalan saat offline.
 */
const page = <M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) => ({
  lazy: async () => ({ Component: (await load())[name] as ComponentType }),
})

/** Semua rute selain /login memerlukan sesi (RequireAuth). */
export const router = createBrowserRouter([
  {
    path: '/login',
    ...page(() => import('@/features/auth/LoginPage'), 'LoginPage'),
    HydrateFallback: RouteLoading,
  },
  {
    element: <RequireAuth />,
    HydrateFallback: RouteLoading,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, ...page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage') },
          { path: 'schedule', ...page(() => import('@/features/schedule/SchedulePage'), 'SchedulePage') },
          { path: 'tasks', ...page(() => import('@/features/tasks/TasksPage'), 'TasksPage') },
          { path: 'tasks/:id', ...page(() => import('@/features/tasks/TaskDetailPage'), 'TaskDetailPage') },
          { path: 'calendar', ...page(() => import('@/features/calendar/CalendarPage'), 'CalendarPage') },
          { path: 'courses', ...page(() => import('@/features/courses/CoursesPage'), 'CoursesPage') },
          { path: 'courses/:id', ...page(() => import('@/features/courses/CourseDetailPage'), 'CourseDetailPage') },
          { path: 'settings', ...page(() => import('@/features/settings/SettingsPage'), 'SettingsPage') },
          { path: '*', ...page(() => import('@/features/NotFoundPage'), 'NotFoundPage') },
        ],
      },
    ],
  },
])
