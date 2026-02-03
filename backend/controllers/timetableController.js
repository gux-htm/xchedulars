const db = require('../config/db');
const { hasConflict } = require('../utils/helpers');
const sendEmail = require('../utils/email');
const PDFDocument = require('pdfkit');
const generateTimetableHTMLFile = require('../utils/generateTimetableHTML');

// Generate course requests
const generateCourseRequests = async (req, res) => {
  try {
    const { semester, major_id } = req.body;
    
    // Get all courses for the semester/major
    let query = 'SELECT c.*, s.id as section_id FROM courses c CROSS JOIN sections s WHERE c.semester = s.semester';
    const params = [];
    
    if (semester) {
      query += ' AND c.semester = ?';
      params.push(semester);
    }
    
    if (major_id) {
      query += ' AND c.major_id = ? AND s.major_id = ?';
      params.push(major_id, major_id);
    }
    
    const [courseSections] = await db.query(query, params);
    
    // Create course requests
    const requests = [];
    for (const cs of courseSections) {
      requests.push([cs.id, cs.section_id, null, 'pending', null]);
    }
    
    if (requests.length > 0) {
      await db.query(
        'INSERT INTO course_requests (course_id, section_id, instructor_id, status, preferences) VALUES ?',
        [requests]
      );
    }
    
    res.json({ message: `Generated ${requests.length} course requests` });
  } catch (error) {
    console.error('Generate course requests error:', error);
    res.status(500).json({ error: 'Failed to generate course requests' });
  }
};

// Get course requests (for instructors)
const getCourseRequests = async (req, res) => {
  try {
    const { status, instructor_id, program, major, semester, section } = req.query;
    
    let query = `
      SELECT cr.*, 
             co.id as offering_id, co.intake, co.academic_year,
             c.name as course_name, c.code as course_code, c.credit_hours,
             s.name as section_name, s.shift,
             m.name as major_name,
             p.name as program_name,
             u.name as instructor_name
      FROM course_requests cr
      JOIN course_offerings co ON cr.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN sections s ON co.section_id = s.id
      JOIN majors m ON co.major_id = m.id
      JOIN programs p ON co.program_id = p.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND cr.status = ?';
      params.push(status);
    }
    
    if (instructor_id) {
      query += ' AND cr.instructor_id = ?';
      params.push(instructor_id);
    }

    if (program) {
        query += ' AND p.id = ?';
        params.push(program);
    }
    if (major) {
        query += ' AND m.id = ?';
        params.push(major);
    }
    if (semester) {
        query += ' AND co.semester = ?';
        params.push(semester);
    }
    if (section) {
        query += ' AND s.id = ?';
        params.push(section);
    }
    
    query += ' ORDER BY cr.created_at DESC';
    
    const [requests] = await db.query(query, params);
    res.json({ requests });
  } catch (error) {
    console.error('Get course requests error:', error);
    res.status(500).json({ error: 'Failed to get course requests' });
  }
};

// Select slots for a course request
const selectSlots = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { request_id, time_slots } = req.body;
        const instructor_id = req.user.id;

        await connection.beginTransaction();

        const [requests] = await connection.query(
            'SELECT * FROM course_requests WHERE id = ? AND status = ? FOR UPDATE',
            [request_id, 'pending']
        );

        if (requests.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Request not found or already accepted' });
        }
        const request = requests[0];

        for (const time_slot_id of time_slots) {
            // Find an available room
            const [availableRooms] = await connection.query(
                `SELECT r.id FROM rooms r
                 LEFT JOIN room_assignments ra ON r.id = ra.room_id AND ra.time_slot_id = ?
                 WHERE ra.id IS NULL
                 ORDER BY r.capacity DESC
                 LIMIT 1`,
                [time_slot_id]
            );

            if (availableRooms.length === 0) {
                await connection.rollback();
                return res.status(409).json({ error: `No available rooms for time slot ${time_slot_id}` });
            }
            const room_id = availableRooms[0].id;

            // Create room assignment and slot reservation
            const [assignmentResult] = await connection.query(
                'INSERT INTO room_assignments (room_id, section_id, time_slot_id, semester, offering_id) VALUES (?, ?, ?, ?, ?)',
                [room_id, request.section_id, time_slot_id, request.semester, request.offering_id || null]
            );

            await connection.query(
                'INSERT INTO slot_reservations (course_request_id, instructor_id, time_slot_id, room_assignment_id, offering_id) VALUES (?, ?, ?, ?, ?)',
                [request_id, instructor_id, time_slot_id, assignmentResult.insertId, request.offering_id || null]
            );
        }

        await connection.query(
            'UPDATE course_requests SET instructor_id = ?, status = ?, accepted_at = NOW() WHERE id = ?',
            [instructor_id, 'accepted', request_id]
        );

        await connection.commit();
        res.json({ message: 'Slots selected and course request accepted successfully' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Select slots error:', error);
        res.status(500).json({ error: 'Failed to select slots' });
    } finally {
        if (connection) connection.release();
    }
};

// Undo course acceptance
const undoCourseAcceptance = async (req, res) => {
  try {
    const { request_id } = req.body;
    const instructor_id = req.user.id;
    
    // Check if request was accepted by this instructor
    const [requests] = await db.query(
      'SELECT * FROM course_requests WHERE id = ? AND instructor_id = ? AND status = ?',
      [request_id, instructor_id, 'accepted']
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }
    
    const request = requests[0];
    const acceptedAt = new Date(request.accepted_at);
    const now = new Date();
    const diffSeconds = (now - acceptedAt) / 1000;
    
    // Check 10-second window
    if (diffSeconds > 10) {
      return res.status(400).json({ error: 'Undo window expired (10 seconds)' });
    }
    
    // Undo acceptance
    await db.query(
      'UPDATE course_requests SET instructor_id = NULL, status = ?, preferences = NULL, accepted_at = NULL WHERE id = ?',
      ['pending', request_id]
    );
    
    res.json({ message: 'Course acceptance undone successfully' });
  } catch (error) {
    console.error('Undo course acceptance error:', error);
    res.status(500).json({ error: 'Failed to undo course acceptance' });
  }
};

// Generate timetable from accepted requests
const generateTimetable = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Clear existing blocks to prevent duplicates
    await connection.query('DELETE FROM blocks');

    // Get all confirmed slot reservations
    const [reservations] = await connection.query(`
      SELECT
          sr.instructor_id,
          cr.course_id,
          cr.section_id,
          ra.room_id,
          ts.day_of_week as day,
          ts.id as time_slot_id,
          s.shift,
          s.semester,
          c.type as course_type
      FROM slot_reservations sr
      JOIN course_requests cr ON sr.course_request_id = cr.id
      JOIN room_assignments ra ON sr.room_assignment_id = ra.id
      JOIN time_slots ts ON sr.time_slot_id = ts.id
      JOIN sections s ON cr.section_id = s.id
      JOIN courses c ON cr.course_id = c.id
      WHERE (cr.status = 'accepted' OR cr.status = 'rescheduled') AND sr.status = 'reserved'
    `);

    if (reservations.length === 0) {
      await connection.commit();
      return res.json({
        message: 'No accepted course requests with reservations to generate timetable from.',
        blocksCreated: 0
      });
    }

    const blocks = reservations.map(r => [
      r.instructor_id,
      r.course_id,
      r.section_id,
      r.room_id,
      r.day.toLowerCase(),
      r.time_slot_id,
      r.shift,
      r.course_type === 'lab' ? 'lab' : 'theory'
    ]);

    // Insert new blocks
    if (blocks.length > 0) {
      await connection.query(
        'INSERT INTO blocks (teacher_id, course_id, section_id, room_id, day, time_slot_id, shift, type) VALUES ?',
        [blocks]
      );

      // Now, populate section_records
      // Optimization: Create a map of section_id -> semester from the reservations query results
      // to avoid N+1 queries inside the loop.
      const sectionSemesterMap = new Map();
      reservations.forEach(r => {
        sectionSemesterMap.set(r.section_id, r.semester);
      });

      const sectionRecords = [];
      const seenSectionCourse = new Set();
      for (const block of blocks) {
        const [teacher_id, course_id, section_id] = block;
        const key = `${section_id}-${course_id}`;

        if (!seenSectionCourse.has(key)) {
          if (sectionSemesterMap.has(section_id)) {
            const semester = sectionSemesterMap.get(section_id);
            sectionRecords.push([section_id, course_id, teacher_id, semester]);
            seenSectionCourse.add(key);
          }
        }
      }

      if (sectionRecords.length > 0) {
        // Clear previous records for the sections involved to avoid stale data
        const sectionIds = [...new Set(reservations.map(r => r.section_id))];
        await connection.query(
            'DELETE FROM section_records WHERE section_id IN (?)',
            [sectionIds]
        );

        await connection.query(
          'INSERT INTO section_records (section_id, course_id, instructor_id, semester) VALUES ?',
          [sectionRecords]
        );
      }
    }

    await connection.commit();
    
    // Send timetable emails to all students
    try {
      await sendTimetableEmails(connection);
    } catch (emailError) {
      console.error('Failed to send timetable emails:', emailError);
      // Don't fail the timetable generation if emails fail
    }
    
    res.json({
      message: 'Timetable generated successfully from confirmed reservations',
      blocksCreated: blocks.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Generate timetable error:', error);
    res.status(500).json({ error: 'Failed to generate timetable' });
  } finally {
    if (connection) connection.release();
  }
};

// Helper function to send timetable emails to students
const sendTimetableEmails = async (connection) => {
  // Get all students with their sections from students table
  const [students] = await connection.query(`
    SELECT st.id, st.name, st.email, st.roll_number, s.id as section_id, s.name as section_name, 
           m.name as major_name, p.name as program_name
    FROM students st
    JOIN sections s ON st.section_id = s.id
    JOIN majors m ON s.major_id = m.id
    JOIN programs p ON m.program_id = p.id
    WHERE st.status = 'active'
  `);
  
  for (const student of students) {
    // Get timetable for this student's section
    const [timetable] = await connection.query(`
      SELECT b.day, ts.slot_label, ts.start_time, ts.end_time,
             c.name as course_name, c.code as course_code,
             u.name as instructor_name,
             r.name as room_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN users u ON b.teacher_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.section_id = ?
      ORDER BY 
        FIELD(b.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        ts.start_time
    `, [student.section_id]);
    
    if (timetable.length === 0) continue;
    
    // Generate HTML timetable for email body
    const htmlContent = generateTimetableHTML(student, timetable);
    
    // Generate HTML file attachment
    let htmlFileContent;
    try {
      console.log(`📄 Generating HTML file for ${student.name} (${student.email})...`);
      htmlFileContent = generateTimetableHTMLFile(student, timetable);
      const htmlBuffer = Buffer.from(htmlFileContent, 'utf-8');
      console.log(`✅ HTML file generated: ${(htmlBuffer.length / 1024).toFixed(2)} KB`);
    } catch (htmlError) {
      console.error(`❌ Failed to generate HTML file for ${student.email}:`, htmlError.message);
    }
    
    // Send email with HTML file attachment
    try {
      const emailOptions = {
        email: student.email,
        subject: `Your Timetable - ${student.program_name} ${student.major_name}`,
        html: htmlContent
      };

      // Add HTML file attachment if generated successfully
      if (htmlFileContent) {
        const filename = `Timetable_${student.section_name}_${student.roll_number}.html`;
        const htmlBuffer = Buffer.from(htmlFileContent, 'utf-8');
        emailOptions.attachments = [{
          filename: filename,
          content: htmlBuffer,
          contentType: 'text/html'
        }];
        console.log(`📎 Attaching HTML file: ${filename} (${(htmlBuffer.length / 1024).toFixed(2)} KB)`);
      }

      await sendEmail(emailOptions);
      console.log(`✅ Timetable email sent to ${student.email} (${student.name})`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${student.email}:`, error.message);
    }
  }
};

// Helper function to generate HTML timetable
const generateTimetableHTML = (student, timetable) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const groupedByDay = {};
  
  days.forEach(day => {
    groupedByDay[day] = timetable.filter(t => t.day.toLowerCase() === day);
  });
  
  let timetableRows = '';
  days.forEach(day => {
    const classes = groupedByDay[day];
    if (classes.length > 0) {
      classes.forEach((cls, index) => {
        timetableRows += `
          <tr>
            ${index === 0 ? `<td rowspan="${classes.length}" style="background-color: #e9d5ff; font-weight: bold; padding: 12px; border: 1px solid #ddd;">${day.charAt(0).toUpperCase() + day.slice(1)}</td>` : ''}
            <td style="padding: 12px; border: 1px solid #ddd;">${cls.slot_label}<br><small style="color: #666;">${cls.start_time} - ${cls.end_time}</small></td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>${cls.course_code}</strong><br>${cls.course_name}</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${cls.instructor_name}</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${cls.room_name}</td>
          </tr>
        `;
      });
    }
  });
  
  const html = `
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
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">📅 Your Timetable</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">EmersonSched</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Dear <strong>${student.name}</strong>,</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Your timetable has been generated! Below are your class details for this semester.
              </p>
              
              <!-- Student Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="font-size: 14px; color: #666666; width: 30%;">📋 Roll Number:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student.roll_number}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">🎓 Program:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student.program_name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">📚 Major:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student.major_name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666666;">📖 Section:</td>
                        <td style="font-size: 14px; color: #333333; font-weight: bold;">${student.section_name}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Timetable -->
              <h2 style="color: #667eea; font-size: 20px; margin: 0 0 20px 0;">📅 Your Weekly Schedule</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="background-color: #667eea; color: white; padding: 12px; border: 1px solid #ddd; text-align: left;">Day</th>
                    <th style="background-color: #667eea; color: white; padding: 12px; border: 1px solid #ddd; text-align: left;">Time</th>
                    <th style="background-color: #667eea; color: white; padding: 12px; border: 1px solid #ddd; text-align: left;">Course</th>
                    <th style="background-color: #667eea; color: white; padding: 12px; border: 1px solid #ddd; text-align: left;">Instructor</th>
                    <th style="background-color: #667eea; color: white; padding: 12px; border: 1px solid #ddd; text-align: left;">Room</th>
                  </tr>
                </thead>
                <tbody>
                  ${timetableRows}
                </tbody>
              </table>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #d1ecf1; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #0c5460; line-height: 1.6;">
                      <strong>📎 PDF Attachment:</strong><br>
                      Your timetable is also attached as a PDF file for easy printing and offline access.
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px; background-color: #fff3cd; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                      <strong>⚠️ Important:</strong><br>
                      Please save this timetable for your reference. You will receive updates if there are any changes to your schedule.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      View Online Timetable
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 14px; color: #999999;">
                Best regards,<br>
                <strong style="color: #667eea;">EmersonSched Team</strong>
              </p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #cccccc;">
                © 2025 EmersonSched. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  return html;
};

// Get timetable
const getTimetable = async (req, res) => {
  try {
    const { section_id, teacher_id, room_id, shift, intake } = req.query;
    
    let query = `
      SELECT b.*, 
             u.name as teacher_name,
             c.name as course_name, c.code as course_code, c.type,
             s.name as section_name, s.semester, s.intake,
             r.name as room_name,
             ts.slot_label, ts.start_time, ts.end_time,
             m.name as major_name
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      LEFT JOIN majors m ON s.major_id = m.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE 1=1
    `;
    const params = [];
    
    if (section_id) {
      query += ' AND b.section_id = ?';
      params.push(section_id);
    }
    
    if (teacher_id) {
      query += ' AND b.teacher_id = ?';
      params.push(teacher_id);
    }
    
    if (room_id) {
      query += ' AND b.room_id = ?';
      params.push(room_id);
    }
    
    if (shift) {
      query += ' AND b.shift = ?';
      params.push(shift);
    }
    
    if (intake) {
      query += ' AND s.intake = ?';
      params.push(intake);
    }
    
    query += ' ORDER BY b.day, ts.start_time';
    
    const [blocks] = await db.query(query, params);
    
    // Keep day names lowercase to match frontend filter logic
    res.json({ timetable: blocks });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to get timetable' });
  }
};

// Reschedule class
const rescheduleClass = async (req, res) => {
  const { course_request_id, new_schedule } = req.body;
  const instructor_id = req.user.id;

  console.log('🔄 Reschedule request received:', { course_request_id, new_schedule, instructor_id });

  if (!course_request_id || !new_schedule || !Array.isArray(new_schedule) || new_schedule.length === 0) {
    console.error('❌ Missing required fields');
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    console.log('✅ Transaction started');

    // Get the course request with section details
    const [[courseRequest]] = await connection.query(
      `SELECT cr.*, s.shift, s.semester 
       FROM course_requests cr 
       JOIN sections s ON cr.section_id = s.id 
       WHERE cr.id = ? AND cr.instructor_id = ?`, 
      [course_request_id, instructor_id]
    );

    if (!courseRequest) {
      await connection.rollback();
      console.error('❌ Course request not found');
      return res.status(404).json({ message: 'Course request not found or you are not the instructor.' });
    }

    console.log('📋 Course request found:', courseRequest);

    // --- Conflict Checking ---
    for (const slot of new_schedule) {
      // Check instructor availability
      const [instructorClash] = await connection.query(
        `SELECT sr.id FROM slot_reservations sr
         JOIN course_requests cr ON sr.course_request_id = cr.id
         WHERE sr.instructor_id = ? AND sr.time_slot_id = ? AND sr.status = 'reserved' AND cr.id != ?`,
        [instructor_id, slot.time_slot_id, course_request_id]
      );
      if (instructorClash.length > 0) {
        await connection.rollback();
        console.error('❌ Instructor conflict detected');
        return res.status(409).json({ message: `You have a conflict at time slot ${slot.time_slot_id}.` });
      }

      // Check section availability
      const [sectionClash] = await connection.query(
        `SELECT sr.id FROM slot_reservations sr
         JOIN course_requests cr ON sr.course_request_id = cr.id
         WHERE cr.section_id = ? AND sr.time_slot_id = ? AND sr.status = 'reserved' AND cr.id != ?`,
        [courseRequest.section_id, slot.time_slot_id, course_request_id]
      );
      if (sectionClash.length > 0) {
        await connection.rollback();
        console.error('❌ Section conflict detected');
        return res.status(409).json({ message: `The section has a conflict at time slot ${slot.time_slot_id}.` });
      }
    }

    console.log('✅ No conflicts detected');

    // --- Update Schedule ---
    // First, cancel all existing reservations for this course request
    await connection.query(`UPDATE slot_reservations SET status = 'cancelled' WHERE course_request_id = ?`, [course_request_id]);
    console.log('✅ Old reservations cancelled');

    // Create new reservations
    for (const slot of new_schedule) {
      // Find an available room (exclude rooms used by OTHER sections at this time)
      const [availableRooms] = await connection.query(
        `SELECT r.id, r.name FROM rooms r
         WHERE r.id NOT IN (
           SELECT ra.room_id FROM room_assignments ra
           JOIN slot_reservations sr ON ra.id = sr.room_assignment_id
           WHERE ra.time_slot_id = ? 
           AND sr.status = 'reserved'
           AND sr.course_request_id != ?
         )
         ORDER BY r.capacity DESC
         LIMIT 1`,
        [slot.time_slot_id, course_request_id]
      );

      if (availableRooms.length === 0) {
        await connection.rollback();
        console.error('❌ No available rooms for time slot', slot.time_slot_id);
        return res.status(409).json({ message: `No available rooms for time slot ${slot.time_slot_id}.` });
      }
      const roomId = availableRooms[0].id;
      console.log(`✅ Room assigned: ${availableRooms[0].name} for slot ${slot.time_slot_id}`);

      // Create room assignment
      const [roomAssignment] = await connection.query(
        `INSERT INTO room_assignments (room_id, section_id, time_slot_id, semester)
         VALUES (?, ?, ?, ?)`,
        [roomId, courseRequest.section_id, slot.time_slot_id, courseRequest.semester]
      );

      // Create new slot reservation
      await connection.query(
        `INSERT INTO slot_reservations (course_request_id, instructor_id, time_slot_id, room_assignment_id, status)
         VALUES (?, ?, ?, ?, 'reserved')`,
        [course_request_id, instructor_id, slot.time_slot_id, roomAssignment.insertId]
      );
    }
    
    console.log('✅ New reservations created');
    
    // Update the course_requests table with the new schedule
    await connection.query(
      'UPDATE course_requests SET status = ?, preferences = ? WHERE id = ?',
      ['rescheduled', JSON.stringify(new_schedule), course_request_id]
    );

    console.log('✅ Course request updated');

    // Update blocks table (so admin timetable reflects changes)
    // First, delete old blocks for this course request
    await connection.query(
      'DELETE FROM blocks WHERE teacher_id = ? AND course_id = ? AND section_id = ?',
      [instructor_id, courseRequest.course_id, courseRequest.section_id]
    );

    console.log('✅ Old blocks deleted');

    // Create new blocks from the new schedule
    for (const slot of new_schedule) {
      const [[timeSlot]] = await connection.query('SELECT day_of_week FROM time_slots WHERE id = ?', [slot.time_slot_id]);
      const [[room]] = await connection.query(
        'SELECT room_id FROM room_assignments WHERE time_slot_id = ? AND section_id = ? ORDER BY id DESC LIMIT 1',
        [slot.time_slot_id, courseRequest.section_id]
      );
      const [[course]] = await connection.query('SELECT type FROM courses WHERE id = ?', [courseRequest.course_id]);
      
      if (timeSlot && room && course) {
        await connection.query(
          'INSERT INTO blocks (teacher_id, course_id, section_id, room_id, day, time_slot_id, shift, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [instructor_id, courseRequest.course_id, courseRequest.section_id, room.room_id, timeSlot.day_of_week.toLowerCase(), slot.time_slot_id, courseRequest.shift, course.type === 'lab' ? 'lab' : 'theory']
        );
      }
    }

    console.log('✅ New blocks created');

    // Commit transaction before sending emails (so timetable is updated even if emails fail)
    await connection.commit();
    console.log('✅ Transaction committed - reschedule successful');

    // Send updated timetable to all students in the section (after commit)
    try {
      const [students] = await db.query(`
        SELECT st.id, st.name, st.email, st.roll_number,
               s.id as section_id, s.name as section_name, s.semester, s.shift,
               m.name as major_name, p.name as program_name
        FROM students st
        JOIN sections s ON st.section_id = s.id
        JOIN majors m ON s.major_id = m.id
        JOIN programs p ON m.program_id = p.id
        WHERE st.section_id = ? AND st.status = 'active'
      `, [courseRequest.section_id]);
      
      console.log(`📧 Found ${students.length} students to notify`);
      
      if (students.length > 0) {
        // Get course details for notification
        const [[course]] = await db.query('SELECT name, code FROM courses WHERE id = ?', [courseRequest.course_id]);
        const [[instructor]] = await db.query('SELECT name FROM users WHERE id = ?', [instructor_id]);
        
        for (const student of students) {
          try {
            // Get updated timetable for this student's section
            const [timetable] = await db.query(`
              SELECT b.day, ts.slot_label, ts.start_time, ts.end_time,
                     c.name as course_name, c.code as course_code,
                     u.name as instructor_name, u.name as teacher_name,
                     r.name as room_name, c.type
              FROM blocks b
              JOIN courses c ON b.course_id = c.id
              JOIN users u ON b.teacher_id = u.id
              JOIN rooms r ON b.room_id = r.id
              JOIN time_slots ts ON b.time_slot_id = ts.id
              WHERE b.section_id = ?
              ORDER BY 
                FIELD(b.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
                ts.start_time
            `, [student.section_id]);

            // Generate HTML email body
            const htmlContent = generateTimetableHTML(student, timetable);
            
            // Generate HTML file attachment
            let htmlFileContent;
            try {
              htmlFileContent = generateTimetableHTMLFile(student, timetable);
            } catch (htmlError) {
              console.error(`Failed to generate HTML file for ${student.email}:`, htmlError.message);
            }

            const emailOptions = {
              email: student.email,
              subject: `Timetable Updated - ${course.code} Rescheduled`,
              html: htmlContent.replace(
                'Your timetable has been generated!',
                `Your timetable has been updated! <strong>${course.code} - ${course.name}</strong> has been rescheduled by ${instructor.name}.`
              )
            };

            // Add HTML file attachment
            if (htmlFileContent) {
              const filename = `Timetable_${student.section_name}_${student.roll_number}.html`;
              const htmlBuffer = Buffer.from(htmlFileContent, 'utf-8');
              emailOptions.attachments = [{
                filename: filename,
                content: htmlBuffer,
                contentType: 'text/html'
              }];
            }

            await sendEmail(emailOptions);
            console.log(`✅ Updated timetable sent to ${student.email} (${student.name})`);
          } catch (emailError) {
            console.error(`❌ Failed to send reschedule email to ${student.email}:`, emailError.message);
          }
        }
      }
    } catch (emailError) {
      console.error('❌ Error sending notification emails:', emailError.message);
      // Don't fail the request if emails fail
    }

    console.log('✅ Reschedule completed successfully');
    res.status(200).json({ message: 'Class rescheduled successfully and students notified.' });
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error rescheduling class:', err);
    console.error('Error details:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: err.message || 'Server error while rescheduling class.' });
  } finally {
    connection.release();
  }
};

// Reset timetable
const resetTimetable = async (req, res) => {
  try {
    const { type } = req.body; // 'slots', 'assignments', 'full'
    
    if (type === 'slots') {
      await db.query('DELETE FROM time_slots');
    } else if (type === 'assignments') {
      await db.query('DELETE FROM blocks');
      await db.query('UPDATE course_requests SET status = ?, instructor_id = NULL, preferences = NULL', ['pending']);
    } else if (type === 'full') {
      await db.query('DELETE FROM blocks');
      await db.query('DELETE FROM course_requests');
      await db.query('DELETE FROM time_slots');
    }
    
    res.json({ message: `Timetable reset (${type}) completed successfully` });
  } catch (error) {
    console.error('Reset timetable error:', error);
    res.status(500).json({ error: 'Failed to reset timetable' });
  }
};

// Get instructor schedule (Problem 1 fix)
const getInstructorSchedule = async (req, res) => {
  try {
    const instructor_id = req.params.instructor_id || req.user.id;
    const { from, to } = req.query;
    
    // Validate instructor_id is provided and user has permission
    if (!instructor_id) {
      return res.status(400).json({ error: 'Instructor ID is required' });
    }
    
    // Check if user can access this instructor's schedule (instructor themselves or admin)
    if (req.user.role !== 'admin' && req.user.id !== instructor_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = `
      SELECT b.id AS assignment_id,
             s.id AS section_id,
             c.id AS course_id,
             c.name AS course_name,
             c.code AS course_code,
             c.type AS course_type,
             s.name AS section_name,
             s.semester,
             s.shift,
             m.name AS major_name,
             r.name AS room_name,
             b.day AS day_of_week,
             ts.start_time,
             ts.end_time,
             ts.slot_label,
             'assigned' AS status,
             b.created_at AS date_from,
             NULL AS date_to
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN majors m ON s.major_id = m.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.teacher_id = ?
    `;
    const params = [instructor_id];
    
    // Apply date filters if provided
    if (from) {
      query += ' AND b.created_at >= ?';
      params.push(from);
    }
    
    if (to) {
      query += ' AND b.created_at <= ?';
      params.push(to);
    }
    
    query += ' ORDER BY b.day, ts.start_time';
    
    const [schedule] = await db.query(query, params);
    
    res.json({ 
      schedule,
      instructor_id,
      total_classes: schedule.length
    });
  } catch (error) {
    console.error('Get instructor schedule error:', error);
    res.status(500).json({ error: 'Failed to get instructor schedule' });
  }
};

// Get available slots for course request (Problem 2 fix)
const getAvailableSlotsForRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const instructor_id = req.query.instructor_id || req.user.id;
    
    if (!request_id || !instructor_id) {
      return res.status(400).json({ error: 'Request ID and instructor ID are required' });
    }
    
    // Get course request details
    const [requests] = await db.query(
      `SELECT cr.*, s.shift, s.semester 
       FROM course_requests cr 
       JOIN sections s ON cr.section_id = s.id 
       WHERE cr.id = ?`,
      [request_id]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Course request not found' });
    }
    
    const request = requests[0];
    
    // Get candidate slots for this shift
    const [candidateSlots] = await db.query(
      'SELECT * FROM time_slots WHERE shift = ? ORDER BY start_time',
      [request.shift]
    );
    
    // Get slots already taken for this section (by any instructor)
    const [sectionTakenSlots] = await db.query(
      `SELECT DISTINCT ts.id as time_slot_id, u.name as instructor_name
       FROM blocks b
       JOIN time_slots ts ON b.time_slot_id = ts.id
       JOIN users u ON b.teacher_id = u.id
       WHERE b.section_id = ?`,
      [request.section_id]
    );
    
    // Get slots occupied by this instructor (any section)
    const [instructorBusySlots] = await db.query(
      `SELECT DISTINCT ts.id as time_slot_id, 
              CONCAT(c.code, ' - ', s.name) as conflicting_class
       FROM blocks b
       JOIN time_slots ts ON b.time_slot_id = ts.id
       JOIN courses c ON b.course_id = c.id
       JOIN sections s ON b.section_id = s.id
       WHERE b.teacher_id = ?`,
      [instructor_id]
    );
    
    // Create maps for blocked slots with reasons
    const sectionBlockedMap = new Map();
    sectionTakenSlots.forEach(slot => {
      sectionBlockedMap.set(slot.time_slot_id, `Already assigned to ${slot.instructor_name} for this section`);
    });
    
    const instructorBlockedMap = new Map();
    instructorBusySlots.forEach(slot => {
      instructorBlockedMap.set(slot.time_slot_id, `You already have a class at this time: ${slot.conflicting_class}`);
    });
    
    // Categorize slots
    const availableSlots = [];
    const blockedSlots = [];
    
    candidateSlots.forEach(slot => {
      const sectionBlocked = sectionBlockedMap.has(slot.id);
      const instructorBlocked = instructorBlockedMap.has(slot.id);
      
      if (sectionBlocked || instructorBlocked) {
        blockedSlots.push({
          ...slot,
          blocked_by: sectionBlocked ? 'section' : 'instructor',
          reason: sectionBlocked ? sectionBlockedMap.get(slot.id) : instructorBlockedMap.get(slot.id)
        });
      } else {
        availableSlots.push(slot);
      }
    });
    
    res.json({
      request_id: parseInt(request_id),
      instructor_id,
      section_id: request.section_id,
      available_slots: availableSlots,
      blocked_slots: blockedSlots,
      total_available: availableSlots.length,
      total_blocked: blockedSlots.length
    });
    
  } catch (error) {
    console.error('Get available slots for request error:', error);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
};

// Accept course request with atomic slot reservation (Problem 2 fix)
const acceptCourseRequest = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { request_id, time_slot_ids } = req.body;
    const instructor_id = req.user.id;
    
    if (!request_id || !time_slot_ids || !Array.isArray(time_slot_ids) || time_slot_ids.length === 0) {
      return res.status(400).json({ error: 'Request ID and time slot IDs are required' });
    }
    
    await connection.beginTransaction();
    
    // Get and lock the course request
    const [requests] = await connection.query(
      'SELECT * FROM course_requests WHERE id = ? AND status = ? FOR UPDATE',
      [request_id, 'pending']
    );
    
    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Course request not found or already processed' });
    }
    
    const request = requests[0];
    
    // Atomic conflict checking for each slot
    for (const time_slot_id of time_slot_ids) {
      // Check if slot is already taken for this section
      const [sectionConflict] = await connection.query(
        `SELECT b.id, u.name as instructor_name 
         FROM blocks b 
         JOIN users u ON b.teacher_id = u.id
         WHERE b.section_id = ? AND b.time_slot_id = ? FOR UPDATE`,
        [request.section_id, time_slot_id]
      );
      
      if (sectionConflict.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          error: `Slot already taken for this section by ${sectionConflict[0].instructor_name}` 
        });
      }
      
      // Check if instructor is busy at this slot
      const [instructorConflict] = await connection.query(
        `SELECT b.id, c.code as course_code, s.name as section_name
         FROM blocks b
         JOIN courses c ON b.course_id = c.id
         JOIN sections s ON b.section_id = s.id
         WHERE b.teacher_id = ? AND b.time_slot_id = ? FOR UPDATE`,
        [instructor_id, time_slot_id]
      );
      
      if (instructorConflict.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          error: `You are busy at this time with ${instructorConflict[0].course_code} - ${instructorConflict[0].section_name}` 
        });
      }
    }
    
    // All slots are available, proceed with assignment
    for (const time_slot_id of time_slot_ids) {
      // Find available room
      const [availableRooms] = await connection.query(
        `SELECT r.id, r.name FROM rooms r
         WHERE r.id NOT IN (
           SELECT b.room_id FROM blocks b
           WHERE b.time_slot_id = ? AND b.shift = ?
         )
         ORDER BY r.capacity DESC
         LIMIT 1`,
        [time_slot_id, request.shift]
      );
      
      if (availableRooms.length === 0) {
        await connection.rollback();
        return res.status(409).json({ 
          error: `No available rooms for time slot ${time_slot_id}` 
        });
      }
      
      const room_id = availableRooms[0].id;
      
      // Get time slot and course details for block creation
      const [[timeSlot]] = await connection.query(
        'SELECT day_of_week FROM time_slots WHERE id = ?', 
        [time_slot_id]
      );
      
      const [[course]] = await connection.query(
        'SELECT type FROM courses WHERE id = ?', 
        [request.course_id]
      );
      
      // Create block (assignment)
      await connection.query(
        `INSERT INTO blocks (teacher_id, course_id, section_id, room_id, day, time_slot_id, shift, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          instructor_id, 
          request.course_id, 
          request.section_id, 
          room_id,
          timeSlot.day_of_week.toLowerCase(),
          time_slot_id,
          request.shift,
          course.type === 'lab' ? 'lab' : 'theory'
        ]
      );
    }
    
    // Update course request status
    await connection.query(
      'UPDATE course_requests SET instructor_id = ?, status = ?, accepted_at = NOW() WHERE id = ?',
      [instructor_id, 'accepted', request_id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Course request accepted successfully',
      request_id: parseInt(request_id),
      slots_assigned: time_slot_ids.length
    });
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Accept course request error:', error);
    res.status(500).json({ error: 'Failed to accept course request' });
  } finally {
    if (connection) connection.release();
  }
};

// Get available slots for rescheduling (existing functionality)
const getAvailableSlots = async (req, res) => {
  const { section_id, instructor_id } = req.query;

  if (!section_id || !instructor_id) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    // Get all time slots
    const [allSlots] = await db.query('SELECT * FROM time_slots');

    // Get instructor's reserved slots
    const [instructorSlots] = await db.query(
      `SELECT sr.time_slot_id FROM slot_reservations sr
       JOIN course_requests cr ON sr.course_request_id = cr.id
       WHERE sr.instructor_id = ? AND sr.status = 'reserved'`,
      [instructor_id]
    );
    const instructorReservedIds = new Set(instructorSlots.map(s => s.time_slot_id));

    // Get section's reserved slots
    const [sectionSlots] = await db.query(
      `SELECT sr.time_slot_id FROM slot_reservations sr
       JOIN course_requests cr ON sr.course_request_id = cr.id
       WHERE cr.section_id = ? AND sr.status = 'reserved'`,
      [section_id]
    );
    const sectionReservedIds = new Set(sectionSlots.map(s => s.time_slot_id));

    // Filter available slots
    const availableSlots = allSlots.filter(
      slot => !instructorReservedIds.has(slot.id) && !sectionReservedIds.has(slot.id)
    );

    res.json({ available_slots: availableSlots });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
};

module.exports = {
  generateCourseRequests,
  getCourseRequests,
  selectSlots,
  undoCourseAcceptance,
  generateTimetable,
  getTimetable,
  rescheduleClass,
  resetTimetable,
  getAvailableSlots,
  getInstructorSchedule,
  getAvailableSlotsForRequest,
  acceptCourseRequest
};
