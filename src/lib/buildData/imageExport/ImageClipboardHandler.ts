import type { Result } from './BuildImageExporter';

/**
 * Handles clipboard copy and fallback download for image sharing.
 * Strategy:
 * 1. Try modern ClipboardItem API for clipboard copy
 * 2. Fallback to download via <a> element if clipboard unavailable
 */
export class ImageClipboardHandler {
  /**
   * Share an image blob via clipboard or download fallback.
   * 
   * @param pngBlob - The PNG image blob to share
   * @returns Result indicating "clipboard" or "download" success, or error
   */
  async share(pngBlob: Blob): Promise<Result<"clipboard" | "download">> {
    try {
      // Try clipboard API first
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          const item = new ClipboardItem({ 'image/png': pngBlob });
          await navigator.clipboard.write([item]);
          return { success: true, data: 'clipboard' };
        } catch (clipboardError) {
          // Clipboard failed, fall through to download
          console.warn('Clipboard write failed, falling back to download:', clipboardError);
        }
      }

      // Fallback: Download via <a> element
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `build-${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up blob URL after a short delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 100);

      return { success: true, data: 'download' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Image sharing failed: ${message}` };
    }
  }
}
