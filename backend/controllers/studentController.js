
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/email');

// Get all programs (public for registration)
exports.getPrograms = async (req, res) => {
  try {
    const [programs] = await db.query(
      'SELECT id, name, code, shift FROM programs ORDER BY name'
    );
    console.log('Programs fetched:', programs.length, 'programs');
    res.json({ programs });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};

// Get majors by program (public for registration)
exports.getMajors = async (req, res) => {
  const { program_id } = req.query;
  
  try {
    let query = 'SELECT id, name, code, program_id FROM majors';
    let params = [];
    
    if (program_id) {
      query += ' WHERE program_id = ?';
      params.push(program_id);
    }
    
    query += ' ORDER BY name';
    
    const [majors] = await db.query(query, params);
    res.json({ majors });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({ error: 'Failed to fetch majors' });
  }
};

// Get sections by major (public for registration)
exports.getSections = async (req, res) => {
  const { major_id } = req.query;
  
  try {
    let query = `
      SELECT s.id, s.name, s.semester, s.shift, s.major_id,
             m.name as major_name, p.name as program_name
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
    `;
    let params = [];
    
    if (major_id) {
      query += ' WHERE s.major_id = ?';
      params.push(major_id);
    }
    
    query += ' ORDER BY s.semester, s.name';
    
    console.log('Fetching sections with query:', query, 'params:', params);
    const [sections] = await db.query(query, params);
    console.log('Sections fetched:', sections.length, 'sections for major_id:', major_id);
    res.json({ sections });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
};

// Student Registration (No password required)
exports.registerStudent = [
  // Validation
  body('roll_number').trim().notEmpty().withMessage('Roll number is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('section_id').isInt().withMessage('Valid section ID is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required'),
  body('phone').optional().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roll_number, name, email, section_id, semester, phone } = req.body;

    try {
      // Check if section exists
      const [sections] = await db.query('SELECT * FROM sections WHERE id = ?', [section_id]);
      if (sections.length === 0) {
        return res.status(404).json({ error: 'Section not found' });
      }

      // Check if roll number already exists
      const [existingRoll] = await db.query('SELECT id FROM students WHERE roll_number = ?', [roll_number]);
      if (existingRoll.length > 0) {
        return res.status(409).json({ error: 'Roll number already registered' });
      }

      // Check if email already exists
      const [existingEmail] = await db.query('SELECT id FROM students WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Insert student
      const [result] = await db.query(
        `INSERT INTO students (roll_number, name, email, section_id, semester, phone, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [roll_number, name, email, section_id, semester, phone || null]
      );

      // Get the created student with section details
      const [student] = await db.query(
        `SELECT s.*, sec.name as section_name, sec.shift, 
                m.name as major_name, p.name as program_name
         FROM students s
         JOIN sections sec ON s.section_id = sec.id
         JOIN majors m ON sec.major_id = m.id
         JOIN programs p ON m.program_id = p.id
         WHERE s.id = ?`,
        [result.insertId]
      );

      // Send confirmation email
      try {
        const emailSubject = '🎓 Registration Successful - Xchedular';
        
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎓 Xchedular</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Registration Successful!</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Dear <strong>${name}</strong>,</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Welcome to Xchedular! Your registration has been successfully completed. Below are your registration details:
              </p>
              
              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="font-size: 14px; color: #666666; width: 40%;">📋 Roll Number:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${roll_number}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">👤 Name:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">📧 Email:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${email}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">🎓 Program:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student[0].program_name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">📚 Major:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student[0].major_name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">📖 Section:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student[0].section_name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">🕐 Shift:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold; text-transform: capitalize;">${student[0].shift}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">📅 Semester:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${semester}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #e3f2fd; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #1976d2; line-height: 1.6;">
                      <strong>📌 Next Steps:</strong><br>
                      Your timetable will be available once the admin generates the schedule. You will receive another email with your timetable details.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Access Your Timetable
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #999999; line-height: 1.6;">
                If you have any questions, please contact your academic advisor.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 14px; color: #999999;">
                Best regards,<br>
                <strong style="color: #667eea;">Xchedular Team</strong>
              </p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #cccccc;">
                © 2025 Xchedular. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim();

        await sendEmail({
          email: email,
          subject: emailSubject,
          message: `Registration successful for ${name}`,
          html: emailHtml,
        });

        console.log(`✅ Confirmation email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the registration if email fails
      }

      res.status(201).json({
        message: 'Student registered successfully. Confirmation email sent.',
        student: student[0]
      });
    } catch (error) {
      console.error('Student registration error:', error);
      res.status(500).json({ error: 'Failed to register student' });
    }
  }
];

// Get student by roll number
exports.getStudentByRollNumber = async (req, res) => {
  const { roll_number } = req.params;

  try {
    const [students] = await db.query(
      `SELECT s.*, sec.name as section_name, sec.shift, sec.semester,
              m.name as major_name, m.code as major_code,
              p.name as program_name
       FROM students s
       JOIN sections sec ON s.section_id = sec.id
       JOIN majors m ON sec.major_id = m.id
       JOIN programs p ON m.program_id = p.id
       WHERE s.roll_number = ?`,
      [roll_number]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ student: students[0] });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

// Get student timetable by roll number
exports.getStudentTimetable = async (req, res) => {
  const { roll_number } = req.params;

  try {
    // Get student and section info
    const [students] = await db.query(
      'SELECT section_id, semester FROM students WHERE roll_number = ?',
      [roll_number]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { section_id } = students[0];

    // Get timetable blocks for this section
    const [blocks] = await db.query(
      `SELECT b.*, 
              c.code as course_code, c.name as course_name, c.type as course_type,
              r.name as room_name, r.building,
              ts.start_time, ts.end_time, ts.slot_label,
              u.name as instructor_name
       FROM blocks b
       JOIN courses c ON b.course_id = c.id
       JOIN rooms r ON b.room_id = r.id
       JOIN time_slots ts ON b.time_slot_id = ts.id
       JOIN users u ON b.teacher_id = u.id
       WHERE b.section_id = ?
       ORDER BY 
         FIELD(b.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
         ts.start_time`,
      [section_id]
    );

    res.json({ timetable: blocks });
  } catch (error) {
    console.error('Get student timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
};

// Get all students (admin only)
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(
      `SELECT s.*, sec.name as section_name, sec.shift,
              m.name as major_name, p.name as program_name
       FROM students s
       JOIN sections sec ON s.section_id = sec.id
       JOIN majors m ON sec.major_id = m.id
       JOIN programs p ON m.program_id = p.id
       ORDER BY s.roll_number`
    );

    res.json({ students });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Get students by section
exports.getStudentsBySection = async (req, res) => {
  const { section_id } = req.params;

  try {
    const [students] = await db.query(
      `SELECT s.*, sec.name as section_name, sec.shift,
              m.name as major_name, p.name as program_name
       FROM students s
       JOIN sections sec ON s.section_id = sec.id
       JOIN majors m ON sec.major_id = m.id
       JOIN programs p ON m.program_id = p.id
       WHERE s.section_id = ?
       ORDER BY s.roll_number`,
      [section_id]
    );

    res.json({ students });
  } catch (error) {
    console.error('Get students by section error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Update student status
exports.updateStudentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'graduated'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.query('UPDATE students SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Student status updated successfully' });
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({ error: 'Failed to update student status' });
  }
};