const DEFAULT_CERTIFICATE_FILENAME = 'certificate.pdf';

export function filenameFromContentDisposition(contentDisposition?: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replace(/["']/g, '');
  }
  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (!basicMatch?.[1]) return null;
  return basicMatch[1];
}

export function triggerBlobDownload(blob: Blob, filename?: string | null): void {
  const safeName = filename && filename.trim().length > 0 ? filename : DEFAULT_CERTIFICATE_FILENAME;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}
