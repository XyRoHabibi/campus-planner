/** Palet warna identitas mata kuliah. Warna selalu ditemani label teks (prd.md §9.4). */
export const COURSE_COLORS = [
  { hex: '#4F46E5', name: 'Indigo' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#D28A26', name: 'Kuning tua' },
  { hex: '#D6589F', name: 'Merah muda' },
  { hex: '#4B8B68', name: 'Hijau' },
  { hex: '#3B82C4', name: 'Biru' },
  { hex: '#8B5CF6', name: 'Ungu' },
  { hex: '#E06C3C', name: 'Oranye' },
] as const

export const COURSE_COLOR_HEXES = COURSE_COLORS.map((c) => c.hex)

export const FALLBACK_COURSE_COLOR = '#667085'
