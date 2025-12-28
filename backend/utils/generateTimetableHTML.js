
/**
 * Generate a standalone HTML file for a student's timetable
 * Uses the SAME format as the frontend export button
 * @param {Object} student - Student information with section details
 * @param {Array} timetable - Array of timetable blocks
 * @returns {String} HTML content
 */
const generateTimetableHTML = (student, timetable) => {
  // Use the EXACT same format as frontend export
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const groupedByDay = {};
  
  days.forEach(day => {
    groupedByDay[day] = timetable.filter(t => t.day.toLowerCase() === day);
  });
  
  // Generate day sections like frontend export
  let dayTables = '';
  days.forEach(day => {
    const dayClasses = groupedByDay[day];
    if (dayClasses.length > 0) {
      dayTables += `
        <div class="day-header">${day.toUpperCase()}</div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Course</th>
              <th>Instructor</th>
              <th>Room</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      dayClasses.forEach((cls) => {
        dayTables += `
          <tr>
            <td>${cls.slot_label || cls.start_time}</td>
            <td>${cls.course_code} - ${cls.course_name}</td>
            <td>${cls.instructor_name || cls.teacher_name}</td>
            <td>${cls.room_name}</td>
            <td>${cls.type || 'theory'}</td>
          </tr>
        `;
      });
      
      dayTables += `
          </tbody>
        </table>
      `;
    }
  });

  // Use EXACT same format as frontend export button
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timetable Export</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #A855F7; text-align: center; }
    h2 { color: #333; margin-top: 30px; border-bottom: 2px solid #A855F7; padding-bottom: 5px; }
    .section-info { background: #f3f4f6; padding: 10px; margin: 10px 0; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #A855F7; color: white; padding: 10px; text-align: left; }
    td { border: 1px solid #ddd; padding: 8px; }
    tr:nth-child(even) { background: #f9fafb; }
    .day-header { background: #e5e7eb; font-weight: bold; padding: 10px; margin-top: 20px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>📅 Xchedular Timetable</h1>
  <p style="text-align: center; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
  
  <div style="page-break-before: always;">
    <h2>Section ${student.section_name}</h2>
    <div class="section-info">
      <strong>Program:</strong> ${student.program_name} | 
      <strong>Major:</strong> ${student.major_name} | 
      <strong>Semester:</strong> ${student.semester || 'N/A'} | 
      <strong>Shift:</strong> ${student.shift || 'N/A'}
    </div>
    <div class="section-info">
      <strong>Student:</strong> ${student.name} | 
      <strong>Roll Number:</strong> ${student.roll_number}
    </div>
    
    ${dayTables}
  </div>
</body>
</html>`;

  return html;
};

module.exports = generateTimetableHTML;