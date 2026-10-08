// Terapkan tema pilihan sebelum render pertama agar tidak berkedip. Aman bila localStorage diblokir.
// Berkas statis (bukan inline) supaya Content-Security-Policy cukup `script-src 'self'`.
try {
  var t = JSON.parse(localStorage.getItem('campus-planner:theme'))
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch {
  // localStorage tidak tersedia atau isinya rusak: biarkan tema mengikuti sistem.
}
