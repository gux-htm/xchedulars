
const PDFDocument = require('pdfkit');

/**
 * Generate a PDF buffer for a student's timetable
 * @param {Object} student - Student information
 * @param {Array} timetable - Array of timetable blocks
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateTimetablePDF = (student, timetable) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const chunks = [];
      
      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error',