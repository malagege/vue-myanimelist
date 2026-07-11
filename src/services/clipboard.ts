/**
 * 剪貼簿服務：優先使用 Clipboard API，失敗時退回隱藏 textarea。
 */

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 退回舊方案
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) {
      throw new Error('瀏覽器不允許複製到剪貼簿')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}
