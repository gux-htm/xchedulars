const db = require('../../config/db');
const timetableController = require('../../controllers/timetableController');

async function runBenchmark() {
    console.log('Starting Benchmark for selectSlots...');

    // Setup Data
    const suffix = Math.floor(Math.random() * 100000);
    const email = `bench_instr_${suffix}@test.com`;
    const sectionName = `BenchSection_${suffix}`;

    let connection;
    try {
        connection = await db.getConnection();

        // 1. Create Instructor
        const [userResult] = await connection.query(
            "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, 'pass', 'instructor', 'active')",
            [`Bench Instructor ${suffix}`, email]
        );
        const instructorId = userResult.insertId;

        // 2. Create Time Slots (Need 10 slots to simulate some load/selection)
        const slotIds = [];
        for(let i=0; i<10; i++) {
             // Create unique times to avoid potential unique constraints if any
             const h = 8 + Math.floor(i/2);
             const m = (i%2) * 30;
             const start = `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:00`;
             const endH = m === 30 ? h + 1 : h;
             const endM = m === 30 ? 0 : 30;
             const end = `${endH < 10 ? '0'+endH : endH}:${endM < 10 ? '0'+endM : endM}:00`;

             const [res] = await connection.query(
                 "INSERT INTO time_slots (day_of_week, start_time, end_time, slot_label, shift) VALUES ('Monday', ?, ?, ?, 'morning')",
                 [start, end, `Slot ${suffix}_${i}`]
             );
             slotIds.push(res.insertId);
        }

        // 3. Create Rooms (100 rooms)
        const roomIds = [];
        for(let i=0; i<100; i++) {
            const [res] = await connection.query(
                "INSERT INTO rooms (name, capacity, type) VALUES (?, ?, 'lecture')",
                [`Room ${suffix}_${i}`, 50 + i] // Varying capacity
            );
            roomIds.push(res.insertId);
        }

        // 4. Create Course/Section/Offering/Request
        const [courseRes] = await connection.query("INSERT INTO courses (name, code, credit_hours, type, semester) VALUES (?, ?, 3, 'theory', 1)", [`Bench Course ${suffix}`, `BC${suffix}`]);
        const courseId = courseRes.insertId;

        const [programRes] = await connection.query("INSERT INTO programs (name) VALUES (?)", [`BenchProg ${suffix}`]);
        const programId = programRes.insertId;

        const [majorRes] = await connection.query("INSERT INTO majors (name, program_id) VALUES (?, ?)", [`BenchMajor ${suffix}`, programId]);
        const majorId = majorRes.insertId;

        const [sectionRes] = await connection.query("INSERT INTO sections (name, major_id, semester, shift, intake) VALUES (?, ?, 1, 'morning', 'A')", [sectionName, majorId]);
        const sectionId = sectionRes.insertId;

        const [offeringRes] = await connection.query("INSERT INTO course_offerings (course_id, section_id, program_id, major_id, semester, intake, academic_year) VALUES (?, ?, ?, ?, 1, 'A', '2024')", [courseId, sectionId, programId, majorId]);
        const offeringId = offeringRes.insertId;

        const [requestRes] = await connection.query(
            "INSERT INTO course_requests (course_id, section_id, instructor_id, status, offering_id, semester) VALUES (?, ?, NULL, 'pending', ?, 1)",
            [courseId, sectionId, offeringId]
        );
        const requestId = requestRes.insertId;

        // Mock Req/Res - Select 5 slots
        const selectedSlots = slotIds.slice(0, 5);
        const req = {
            user: { id: instructorId },
            body: {
                request_id: requestId,
                time_slots: selectedSlots
            }
        };

        const res = {
            statusCode: 200,
            body: null,
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.body = data; return this; }
        };

        // Run Benchmark
        console.log('Data seeded. Running selectSlots...');
        const start = process.hrtime();

        await timetableController.selectSlots(req, res);

        const end = process.hrtime(start);
        const timeInMs = (end[0] * 1000 + end[1] / 1e6).toFixed(2);

        console.log(`Execution Time: ${timeInMs} ms`);
        console.log('Response Status:', res.statusCode);

        if (res.statusCode !== 200 && res.body) {
             console.log('Error Body:', res.body);
        }

        // Verification
        if (res.statusCode === 200) {
            const [assignments] = await connection.query("SELECT * FROM room_assignments WHERE section_id = ?", [sectionId]);
            const [reservations] = await connection.query("SELECT * FROM slot_reservations WHERE course_request_id = ?", [requestId]);
            console.log(`Created ${assignments.length} assignments and ${reservations.length} reservations.`);

            if (assignments.length !== 5 || reservations.length !== 5) {
                console.error("❌ Mismatch in expected assignments/reservations count!");
            } else {
                console.log("✅ Counts match expectations.");
            }
        }

        // Cleanup
        console.log('Cleaning up...');
        await connection.query("DELETE FROM slot_reservations WHERE course_request_id = ?", [requestId]);
        await connection.query("DELETE FROM room_assignments WHERE section_id = ?", [sectionId]);
        await connection.query("DELETE FROM course_requests WHERE id = ?", [requestId]);
        await connection.query("DELETE FROM course_offerings WHERE id = ?", [offeringId]);
        await connection.query("DELETE FROM sections WHERE id = ?", [sectionId]);
        await connection.query("DELETE FROM courses WHERE id = ?", [courseId]);
        await connection.query("DELETE FROM majors WHERE id = ?", [majorId]);
        await connection.query("DELETE FROM programs WHERE id = ?", [programId]);
        await connection.query("DELETE FROM rooms WHERE name LIKE ?", [`Room ${suffix}_%`]);
        await connection.query("DELETE FROM time_slots WHERE id IN (?)", [slotIds]);
        await connection.query("DELETE FROM users WHERE id = ?", [instructorId]);

    } catch (err) {
        console.error('Benchmark Error:', err);
    } finally {
        if (connection) connection.release();
        // Allow some time for pool to close or just exit
        setTimeout(() => process.exit(), 100);
    }
}

runBenchmark();
