import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures a DOM element with html2canvas and embeds it into a jsPDF document.
 * Returns a Blob (for download) or opens the print dialog.
 *
 * @param {HTMLElement} element  - The DOM node to capture (should be fully rendered)
 * @param {Object}      options
 * @param {string}      options.filename  - PDF filename (default: 'volunteer_pass.pdf')
 * @param {'download'|'print'} options.mode - 'download' saves the file, 'print' opens print dialog
 */
export const generatePassPdf = async (element, { filename = 'volunteer_pass.pdf', mode = 'download' } = {}) => {
  if (!element) {
    throw new Error('No element provided for PDF generation.');
  }

  // ── 1. Capture the element with html2canvas ──────────────────────────────
  const canvas = await html2canvas(element, {
    scale: 3,                   // 3× device pixels → high-resolution output
    useCORS: true,              // allow cross-origin images (profile pictures)
    allowTaint: false,
    backgroundColor: '#ffffff', // guarantee a white background
    logging: false,
    // Ensure we capture the full element, not just the visible viewport portion
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('html2canvas produced an empty canvas. Ensure the element is visible in the DOM.');
  }

  // ── 2. Convert canvas → PNG data URL ────────────────────────────────────
  const imgData = canvas.toDataURL('image/png');

  // ── 3. Build jsPDF with the card centred on an A4 page ──────────────────
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth  = doc.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight();  // 297 mm

  // Card dimensions: fit inside 95 mm × 160 mm box, maintaining aspect ratio
  const boxW = 95;
  const boxH = 160;
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const canvasRatio = canvasW / canvasH;
  const boxRatio = boxW / boxH;

  let cardW = boxW;
  let cardH = boxH;

  if (canvasRatio > boxRatio) {
    cardH = boxW / canvasRatio;
  } else {
    cardW = boxH * canvasRatio;
  }

  const xOffset = (pageWidth  - cardW) / 2;
  const yOffset = (pageHeight - cardH) / 2;

  doc.addImage(imgData, 'PNG', xOffset, yOffset, cardW, cardH);

  // ── 4. Deliver the PDF ───────────────────────────────────────────────────
  if (mode === 'print') {
    doc.autoPrint();
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    
    // Create a hidden iframe to perform seamless, pop-up-blocker-safe printing
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
      // Clean up the iframe and object URL after print dialog is closed
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    };
  } else {
    doc.save(filename);
  }
};
