import type { DownloadFile } from './contracts'

export function downloadFile(file: DownloadFile): void {
  const url = URL.createObjectURL(file.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // La descarga necesita que el navegador alcance a consumir el Blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
