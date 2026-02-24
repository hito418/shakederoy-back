import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

function sanitizeFileName(filename: string): string {
  const extension = path.extname(filename).toLowerCase()
  const base = path
    .basename(filename, extension)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${base || 'upload'}-${randomUUID()}${extension || '.bin'}`
}

export async function saveUploadedFile(file: File, uploadDir: string): Promise<string> {
  const safeFileName = sanitizeFileName(file.name || 'upload.bin')
  const absoluteUploadDir = path.resolve(uploadDir)
  const absolutePath = path.join(absoluteUploadDir, safeFileName)

  await mkdir(absoluteUploadDir, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(absolutePath, Buffer.from(bytes))

  return `/uploads/${safeFileName}`
}
