import { BellRing, CircleAlert, CircleCheck, Download, Globe, Monitor, Moon, Send, Sun } from 'lucide-react'
import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AccountMenu } from '@/components/layout/AccountMenu'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectField } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { useNow } from '@/hooks/useNow'
import { useCourses } from '@/features/courses/hooks'
import { SyncStatus } from '@/features/dashboard/components/SyncStatus'
import { useNotificationPermission } from '@/features/reminders/useNotificationPermission'
import { useSessions } from '@/features/schedule/hooks'
import { OptionCards } from '@/features/settings/components/OptionCards'
import { useSettings } from '@/features/settings/settings-context'
import { useTasks } from '@/features/tasks/hooks'
import { CLASS_LEAD_OPTIONS, TASK_LEAD_OPTIONS, type ThemePref } from '@/lib/settings/settings'
import { requestNotificationPermission, showBrowserNotification } from '@/lib/notifications'
import { installStore } from '@/lib/pwa/install'
import type { WeekStart } from '@/lib/utils/calendar'

const leadLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} menit` : minutes < 1440 ? `${minutes / 60} jam` : `${minutes / 1440} hari`

/** Satu baris pengaturan: judul + penjelasan di kiri, kontrol di kanan. */
function SettingRow({ title, description, control, titleId, descId }: { title: string; description?: ReactNode; control: ReactNode; titleId: string; descId?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p id={titleId} className="text-sm font-semibold">
          {title}
        </p>
        {description && (
          <div id={descId} className="mt-0.5 text-sm text-muted">
            {description}
          </div>
        )}
      </div>
      {control}
    </div>
  )
}

export function SettingsPage() {
  const { settings, update, theme, setTheme, persisted } = useSettings()
  const permission = useNotificationPermission()
  const now = useNow()
  const courses = useCourses()
  const sessions = useSessions()
  const tasks = useTasks()
  const [notifMessage, setNotifMessage] = useState<string | null>(null)
  const install = useSyncExternalStore(installStore.subscribe, installStore.getSnapshot, installStore.getSnapshot)
  const ids = { reminders: useId(), remindersDesc: useId(), browser: useId(), browserDesc: useId() }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const offsetMinutes = -now.getTimezoneOffset()
  const offset = `UTC${offsetMinutes >= 0 ? '+' : '−'}${String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0')}:${String(Math.abs(offsetMinutes) % 60).padStart(2, '0')}`

  /** Izin notifikasi hanya diminta di sini, setelah pengguna sendiri mengaktifkan saklar (prd.md §9.8). */
  const toggleBrowserNotifications = async (next: boolean) => {
    setNotifMessage(null)
    if (!next) return update({ browserNotifications: false })
    let state = permission.state
    if (state === 'default') state = await requestNotificationPermission()
    permission.refresh()
    if (state === 'granted') return update({ browserNotifications: true })
    update({ browserNotifications: false })
    setNotifMessage(
      state === 'denied'
        ? 'Izin notifikasi ditolak. Pengingat tetap tampil di dalam aplikasi. Untuk mengaktifkan notifikasi browser, izinkan lewat pengaturan situs di browser Anda.'
        : state === 'unsupported'
          ? 'Browser ini tidak mendukung notifikasi.'
          : 'Izin notifikasi belum diberikan. Pengingat tetap tampil di dalam aplikasi.',
    )
  }

  const sendTest = async () => {
    const ok = await showBrowserNotification('Notifikasi percobaan', 'Notifikasi browser dari Campus Planner berfungsi.', 'campus-planner-test')
    if (ok) toast.success('Notifikasi percobaan terkirim')
    else toast.error('Notifikasi belum bisa ditampilkan', { description: 'Browser menolak menampilkannya. Pengingat tetap muncul di dalam aplikasi.' })
  }

  const installApp = async () => {
    const result = await installStore.prompt()
    if (result === 'accepted') toast.success('Campus Planner dipasang', { description: 'Buka dari layar utama atau menu aplikasi perangkat Anda.' })
    else if (result === 'unavailable') toast.error('Instalasi belum tersedia', { description: 'Browser ini sedang tidak menawarkan instalasi.' })
  }

  const browserSupported = permission.state !== 'unsupported'
  const browserBlocked = permission.state === 'denied'

  return (
    <>
      <PageHeader title="Pengaturan" description="Tema, pengingat, zona waktu, dan akun." />

      {!persisted && (
        <p role="alert" className="mb-4 flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-fg">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Browser ini tidak mengizinkan penyimpanan pengaturan. Perubahan hanya berlaku sampai halaman ditutup.
        </p>
      )}

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <OptionCards<ThemePref>
              legend="Tema"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'system', label: 'Ikuti sistem', icon: Monitor },
                { value: 'light', label: 'Terang', icon: Sun },
                { value: 'dark', label: 'Gelap', icon: Moon },
              ]}
            />
            <p className="-mt-2 text-xs text-muted">Tema berlaku di perangkat ini.</p>
            <OptionCards<'1' | '0'>
              legend="Hari awal minggu"
              value={String(settings.weekStart) as '1' | '0'}
              onChange={(v) => update({ weekStart: Number(v) as WeekStart })}
              options={[
                { value: '1', label: 'Senin' },
                { value: '0', label: 'Minggu' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing aria-hidden="true" className="size-4" />
              Pengingat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y divide-border">
            <SettingRow
              titleId={ids.reminders}
              descId={ids.remindersDesc}
              title="Pengingat di dalam aplikasi"
              description="Menampilkan kelas yang segera mulai dan tenggat tugas yang mendekat di Beranda dan sebagai pesan singkat."
              control={<Switch checked={settings.remindersEnabled} onCheckedChange={(v) => update({ remindersEnabled: v })} labelledBy={ids.reminders} describedBy={ids.remindersDesc} />}
            />

            <div className={settings.remindersEnabled ? 'space-y-4 py-4' : 'space-y-4 py-4 opacity-60'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-sm font-medium">Ingatkan sebelum kelas</p>
                  <SelectField
                    label="Ingatkan sebelum kelas"
                    value={settings.classLeadMinutes}
                    disabled={!settings.remindersEnabled}
                    onChange={(e) => update({ classLeadMinutes: Number(e.target.value) })}
                  >
                    {CLASS_LEAD_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {leadLabel(m)} sebelumnya
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium">Ingatkan sebelum tenggat tugas</p>
                  <SelectField
                    label="Ingatkan sebelum tenggat tugas"
                    value={settings.taskLeadMinutes}
                    disabled={!settings.remindersEnabled}
                    onChange={(e) => update({ taskLeadMinutes: Number(e.target.value) })}
                  >
                    {TASK_LEAD_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {leadLabel(m)} sebelumnya
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
              <p className="text-xs text-muted">
                Pengingat bisa dimatikan per item di form jadwal dan tugas. Tugas dengan tenggat tanpa jam diingatkan mulai pukul 09.00 pada hari
                tenggat dikurangi jeda di atas.
              </p>
            </div>

            <div className="pt-4">
              <SettingRow
                titleId={ids.browser}
                descId={ids.browserDesc}
                title="Notifikasi browser"
                description={
                  !settings.remindersEnabled ? (
                    'Aktifkan pengingat di dalam aplikasi terlebih dulu.'
                  ) : !browserSupported ? (
                    'Browser ini tidak mendukung notifikasi. Pengingat tetap tampil di dalam aplikasi.'
                  ) : browserBlocked ? (
                    'Izin notifikasi diblokir di browser. Ubah lewat pengaturan situs di browser Anda jika ingin mengaktifkannya; pengingat tetap tampil di dalam aplikasi.'
                  ) : permission.state === 'granted' ? (
                    <span className="inline-flex items-center gap-1">
                      <CircleCheck aria-hidden="true" className="size-4 text-success-fg" />
                      Izin diberikan.
                    </span>
                  ) : (
                    'Izin notifikasi baru diminta saat Anda mengaktifkan ini.'
                  )
                }
                control={
                  <Switch
                    checked={settings.browserNotifications && permission.state === 'granted'}
                    onCheckedChange={(v) => void toggleBrowserNotifications(v)}
                    disabled={!settings.remindersEnabled || !browserSupported || browserBlocked}
                    labelledBy={ids.browser}
                    describedBy={ids.browserDesc}
                  />
                }
              />
              {notifMessage && (
                <p role="alert" className="mt-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-fg">
                  {notifMessage}
                </p>
              )}
              {settings.browserNotifications && permission.state === 'granted' && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => void sendTest()}>
                  <Send aria-hidden="true" />
                  Kirim notifikasi percobaan
                </Button>
              )}
              <p className="mt-3 rounded-lg bg-surface-muted p-3 text-xs text-muted">
                Pengingat dan notifikasi <strong>hanya berjalan saat Campus Planner terbuka di browser</strong>. Notifikasi browser muncul ketika
                tab atau jendela sedang tidak Anda lihat; saat aplikasi terlihat, pengingat tampil di dalam aplikasi. Pengingat saat aplikasi
                ditutup belum tersedia.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe aria-hidden="true" className="size-4" />
              Zona waktu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">
              {timeZone} <span className="font-normal text-muted">({offset})</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              Jadwal, tenggat, dan pengingat mengikuti zona waktu perangkat ini secara otomatis. Mengubah zona waktu di perangkat langsung
              memperbarui tampilan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download aria-hidden="true" className="size-4" />
              Instal aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {install.standalone ? (
              <p className="flex items-center gap-2 text-sm">
                <CircleCheck aria-hidden="true" className="size-4 text-success-fg" />
                Campus Planner sudah terpasang di perangkat ini.
              </p>
            ) : install.canInstall ? (
              <>
                <p className="text-sm text-muted">Pasang sebagai aplikasi agar terbuka dari layar utama, tanpa bilah alamat browser.</p>
                <Button onClick={() => void installApp()}>
                  <Download aria-hidden="true" />
                  Instal aplikasi
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted">
                Browser ini belum menawarkan instalasi. Campus Planner tetap berfungsi penuh di browser. Di iPhone/iPad: buka di Safari, ketuk
                Bagikan, lalu <strong>Tambahkan ke Layar Utama</strong>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Koneksi dan sinkronisasi</CardTitle>
          </CardHeader>
          <CardContent>
            <SyncStatus
              queries={[courses, sessions, tasks]}
              onRefresh={() => {
                void courses.refetch()
                void sessions.refetch()
                void tasks.refetch()
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Akun</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountMenu />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
