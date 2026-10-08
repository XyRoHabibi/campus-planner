import { describe, expect, it, vi } from 'vitest'

import { createInstallStore } from '@/lib/pwa/install'

const promptEvent = (outcome: 'accepted' | 'dismissed') => {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: typeof outcome }> }
  e.prompt = vi.fn(async () => {})
  e.userChoice = Promise.resolve({ outcome })
  return e
}

describe('createInstallStore', () => {
  it('awalnya tidak bisa diinstal; mendeteksi mode aplikasi terpasang', () => {
    expect(createInstallStore(new EventTarget(), () => false).getSnapshot()).toEqual({ canInstall: false, standalone: false })
    expect(createInstallStore(new EventTarget(), () => true).getSnapshot().standalone).toBe(true)
  })

  it('beforeinstallprompt → canInstall; prompt bawaan ditahan; pendengar diberi tahu', () => {
    const target = new EventTarget()
    const store = createInstallStore(target, () => false)
    store.init()
    const listener = vi.fn()
    store.subscribe(listener)
    const e = promptEvent('accepted')
    target.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(store.getSnapshot().canInstall).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('prompt(): meneruskan pilihan pengguna dan hanya bisa dipakai sekali', async () => {
    const target = new EventTarget()
    const store = createInstallStore(target, () => false)
    store.init()
    const e = promptEvent('dismissed')
    target.dispatchEvent(e)
    expect(await store.prompt()).toBe('dismissed')
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().canInstall).toBe(false)
    expect(await store.prompt()).toBe('unavailable')
  })

  it('tanpa event (browser tidak mendukung) → unavailable, tidak melempar', async () => {
    const store = createInstallStore(new EventTarget(), () => false)
    store.init()
    expect(await store.prompt()).toBe('unavailable')
  })

  it('appinstalled → tidak lagi bisa diinstal dan ditandai terpasang', () => {
    const target = new EventTarget()
    const store = createInstallStore(target, () => false)
    store.init()
    target.dispatchEvent(promptEvent('accepted'))
    target.dispatchEvent(new Event('appinstalled'))
    expect(store.getSnapshot()).toEqual({ canInstall: false, standalone: true })
  })

  it('subscribe mengembalikan fungsi berhenti berlangganan', () => {
    const target = new EventTarget()
    const store = createInstallStore(target, () => false)
    store.init()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    off()
    target.dispatchEvent(promptEvent('accepted'))
    expect(listener).not.toHaveBeenCalled()
  })
})
