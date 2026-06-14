import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures a DOM element representing a Certificate with html2canvas and embeds it
 * into a landscape A4 jsPDF document.
 *
 * @param {HTMLElement} element  - The Certificate DOM element
 * @param {Object}      options
 * @param {string}      options.filename  - PDF filename (default: 'volunteer_certificate.pdf')
 * @param {'download'|'print'} options.mode - 'download' saves the file, 'print' triggers printer
 */
export const generateCertificatePdf = async (element, { filename = 'volunteer_certificate.pdf', mode = 'download' } = {}) => {
  if (!element) {
    throw new Error('No element provided for certificate generation.');
  }

  // 1. Capture the element with html2canvas
  const canvas = await html2canvas(element, {
    scale: 3,                   // high resolution
    useCORS: true,              // cross-origin support
    allowTaint: false,
    backgroundColor: '#ffffff', // white page background
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('html2canvas produced an empty canvas.');
  }

  // 2. Convert canvas to PNG data URL
  const imgData = canvas.toDataURL('image/png');

  // 3. Build landscape A4 jsPDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth  = doc.internal.pageSize.getWidth();   // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight();  // 210 mm

  // Fit inside A4 landscape boundary with a 10mm margin safe-zone
  const maxW = pageWidth - 20;  // 277 mm
  const maxH = pageHeight - 20; // 190 mm

  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const canvasRatio = canvasW / canvasH;
  const targetRatio = maxW / maxH;

  let certW = maxW;
  let certH = maxH;

  if (canvasRatio > targetRatio) {
    // Canvas is wider than target safe-zone, scale height down
    certH = maxW / canvasRatio;
  } else {
    // Canvas is taller than target safe-zone, scale width down
    certW = maxH * canvasRatio;
  }

  const xOffset = (pageWidth  - certW) / 2;
  const yOffset = (pageHeight - certH) / 2;

  doc.addImage(imgData, 'PNG', xOffset, yOffset, certW, certH);

  // 4. Deliver the PDF
  if (mode === 'print') {
    doc.autoPrint();
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    
    // Hidden iframe for printer trigger
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = blobUrl;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    };
  } else {
    doc.save(filename);
  }
};
