'use client';

let _pdfPromise: Promise<any> | null = null;

export function getJsPDF(): Promise<any> {
  const win = window as any;
  if (win.jspdf?.jsPDF) return Promise.resolve(win.jspdf.jsPDF);
  if (_pdfPromise) return _pdfPromise;
  _pdfPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.onload = () => resolve(win.jspdf.jsPDF);
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.1/jspdf.umd.min.js';
    document.head.appendChild(script);
  });
  return _pdfPromise;
}
