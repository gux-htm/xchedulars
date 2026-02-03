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
      doc.on('error', error => reject(error));

      doc.fontSize(20).text('Xchedular Timetable', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor('gray')
        .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(1.5);

      doc.fillColor('black').fontSize(12);
      doc.text(`Section: ${student.section_name}`);
      doc.text(`Program: ${student.program_name} | Major: ${student.major_name}`);
      doc.text(`Semester: ${student.semester || 'N/A'} | Shift: ${student.shift || 'N/A'}`);
      doc.text(`Student: ${student.name} | Roll Number: ${student.roll_number}`);
      doc.moveDown(1);

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      days.forEach(day => {
        const dayClasses = timetable.filter(entry => entry.day?.toLowerCase() === day);
        if (dayClasses.length === 0) {
          return;
        }

        doc
          .fontSize(14)
          .fillColor('#4B5563')
          .text(day.toUpperCase());
        doc.moveDown(0.5);
        doc.fillColor('black').fontSize(11);

        dayClasses.forEach((entry) => {
          const timeLabel = entry.slot_label || entry.start_time || 'TBD';
          const courseLabel = `${entry.course_code} - ${entry.course_name}`;
          const instructorLabel = entry.instructor_name || entry.teacher_name || 'TBD';
          const roomLabel = entry.room_name || 'TBD';
          const typeLabel = entry.type || 'theory';

          doc.text(
            `${timeLabel} | ${courseLabel} | ${instructorLabel} | ${roomLabel} | ${typeLabel}`
          );
        });

        doc.moveDown(1);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateTimetablePDF;
