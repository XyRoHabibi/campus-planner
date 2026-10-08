import { describe, expect, it } from 'vitest'

import { UPLOAD_MESSAGES, uploadErrorMessage } from '@/features/attachments/errors'

describe('uploadErrorMessage', () => {
  it('memetakan status/isi respons Storage ke pesan yang bisa dipahami', () => {
    expect(uploadErrorMessage(0, '')).toBe(UPLOAD_MESSAGES.network)
    expect(uploadErrorMessage(413, '')).toBe(UPLOAD_MESSAGES.tooLarge)
    expect(uploadErrorMessage(400, '{"message":"The object exceeded the maximum allowed size"}')).toBe(UPLOAD_MESSAGES.tooLarge)
    expect(uploadErrorMessage(415, '')).toBe(UPLOAD_MESSAGES.badType)
    expect(uploadErrorMessage(400, '{"message":"mime type application/zip is not supported"}')).toBe(UPLOAD_MESSAGES.badType)
    expect(uploadErrorMessage(401, '')).toBe(UPLOAD_MESSAGES.session)
    expect(uploadErrorMessage(403, '')).toBe(UPLOAD_MESSAGES.denied)
    expect(uploadErrorMessage(400, '{"message":"new row violates row-level security policy"}')).toBe(UPLOAD_MESSAGES.denied)
  })

  it('error tak dikenal tidak membocorkan isi respons mentah', () => {
    const msg = uploadErrorMessage(500, '{"message":"relation \\"storage.objects\\" does not exist","stack":"at pg..."}')
    expect(msg).toBe(UPLOAD_MESSAGES.generic)
    expect(msg).not.toMatch(/relation|storage\.objects|stack/)
  })
})
