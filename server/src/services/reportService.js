const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Generate a CSV string from headers and rows
 * @param {Array<string>} headers 
 * @param {Array<Array<any>>} rows 
 * @returns {string} CSV text
 */
const generateCSV = (headers, rows) => {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
  };

  const csvRows = [];
  csvRows.push(headers.map(formatValue).join(','));
  rows.forEach(row => {
    csvRows.push(row.map(formatValue).join(','));
  });

  return csvRows.join('\n');
};

/**
 * Stream an Excel file directly to Express response
 */
const generateExcel = async (title, headers, rows, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.substring(0, 31)); // excel tab limit is 31 chars

  // Add Title block
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F46E5' } // Indigo-600
  };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 40;

  worksheet.addRow([]); // Blank row

  // Add Headers
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' } // Slate-800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add Data rows
  rows.forEach(row => {
    const r = worksheet.addRow(row);
    r.height = 20;
    r.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };
    });
  });

  // Adjust column widths
  worksheet.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 3, 40);
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Stream a PDF file directly to Express response
 */
const generatePDF = (title, headers, rows, res) => {
  // Enable bufferPages: true to allow footer page number rendering on all pages in a second pass
  const doc = new PDFDocument({ margin: 30, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`
  );

  doc.pipe(res);

  // Document Title
  doc.fillColor('#4f46e5').fontSize(22).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  // Table Configuration
  const startX = 30;
  let startY = doc.y;
  const tableWidth = 535; // A4 width 595 - 60 margins
  const pageHeight = 842; // A4 height

  // 1. Calculate dynamic column widths based on content lengths
  const colMaxLengths = headers.map(h => Math.max(h.length, 5));
  rows.forEach(row => {
    row.forEach((cell, colIndex) => {
      const valStr = cell === null || cell === undefined ? '' : String(cell);
      if (valStr.length > colMaxLengths[colIndex]) {
        colMaxLengths[colIndex] = valStr.length;
      }
    });
  });

  const sumMaxLengths = colMaxLengths.reduce((sum, len) => sum + len, 0) || 1;
  const minColWidth = 45;
  let rawColWidths = colMaxLengths.map(len => (len / sumMaxLengths) * tableWidth);

  // Ensure minimum column width boundaries
  let remainingWidth = tableWidth;
  let flexColsSumLength = 0;
  rawColWidths.forEach((w, idx) => {
    if (w < minColWidth) {
      remainingWidth -= minColWidth;
    } else {
      flexColsSumLength += colMaxLengths[idx];
    }
  });

  const finalColWidths = rawColWidths.map((w, idx) => {
    if (w < minColWidth) return minColWidth;
    return (colMaxLengths[idx] / (flexColsSumLength || 1)) * remainingWidth;
  });

  // 2. Draw Table Headers helper
  const drawHeaders = (y) => {
    doc.rect(startX, y, tableWidth, 25).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    
    let currentX = startX;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 5, y + 8, {
        width: finalColWidths[index] - 10,
        align: 'left',
        lineBreak: true
      });
      currentX += finalColWidths[index];
    });
    return y + 25;
  };

  // 3. Draw Table Row helper
  const drawRow = (row, rowIndex, y, rowHeight) => {
    const rowColor = rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(startX, y, tableWidth, rowHeight).fill(rowColor);

    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    let currentX = startX;
    row.forEach((cell, colIndex) => {
      const displayVal = cell === null || cell === undefined ? '' : String(cell);
      
      const textHeight = doc.heightOfString(displayVal, {
        width: finalColWidths[colIndex] - 10,
        fontSize: 9,
        font: 'Helvetica'
      });
      // Vertically center text in the cell
      const verticalPadding = Math.max(5, (rowHeight - textHeight) / 2);

      doc.text(displayVal, currentX + 5, y + verticalPadding, {
        width: finalColWidths[colIndex] - 10,
        align: 'left',
        lineBreak: true
      });
      currentX += finalColWidths[colIndex];
    });

    // Bottom border
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(startX, y + rowHeight).lineTo(startX + tableWidth, y + rowHeight).stroke();
  };

  // 4. Calculate dynamic row height helper
  const getRowHeight = (row) => {
    let maxCellHeight = 22; // min row height
    row.forEach((cell, colIndex) => {
      const displayVal = cell === null || cell === undefined ? '' : String(cell);
      const cellHeight = doc.heightOfString(displayVal, {
        width: finalColWidths[colIndex] - 10,
        fontSize: 9,
        font: 'Helvetica'
      }) + 10; // add cell vertical padding
      if (cellHeight > maxCellHeight) {
        maxCellHeight = cellHeight;
      }
    });
    return Math.min(maxCellHeight, 750); // cap row height to prevent infinite page loop
  };

  // Initial headers rendering
  startY = drawHeaders(startY);

  // 5. Render Data Rows
  rows.forEach((row, rowIndex) => {
    const rowHeight = getRowHeight(row);

    // If row overflows page boundary, add new page & repeat headers
    if (startY + rowHeight > pageHeight - 50) {
      doc.addPage();
      startY = 40;
      startY = drawHeaders(startY);
    }

    drawRow(row, rowIndex, startY, rowHeight);
    startY += rowHeight;
  });

  // 6. Draw Page Numbers on all pages in a second pass
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
      `Page ${i + 1} of ${range.count}`,
      startX,
      pageHeight - 25,
      { align: 'center', width: tableWidth }
    );
  }

  doc.end();
};

module.exports = {
  generateCSV,
  generateExcel,
  generatePDF
};
