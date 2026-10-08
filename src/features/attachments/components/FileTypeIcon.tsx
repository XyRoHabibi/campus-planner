import { File, FileSpreadsheet, FileText, Image, Presentation } from 'lucide-react'

import { extensionOf } from '@/features/attachments/validation'

/** Ikon dekoratif per jenis file; jenis juga selalu ditulis sebagai teks di sampingnya. */
export function FileTypeIcon({ name, className }: { name: string; className?: string }) {
  const ext = extensionOf(name)
  const props = { 'aria-hidden': true as const, className }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <Image {...props} />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet {...props} />
  if (['ppt', 'pptx'].includes(ext)) return <Presentation {...props} />
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText {...props} />
  return <File {...props} />
}
