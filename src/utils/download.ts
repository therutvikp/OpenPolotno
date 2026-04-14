'use client';

export async function downloadFile(url: string, fileName: string, mimeType?: string): Promise<void> {
  const blob = await (await fetch(url)).blob();
  const a = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}
