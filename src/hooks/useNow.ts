import { useEffect, useState } from 'react'

/** Waktu sekarang yang diperbarui tiap menit, agar status kelas/tenggat tetap akurat tanpa refresh. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
