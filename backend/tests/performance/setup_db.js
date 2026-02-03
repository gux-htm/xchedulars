const db = require('../../config/db');

const schema = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(50),
        status VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS time_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_of_week VARCHAR(50),
        start_time TIME,
        end_time TIME,
        slot_label VARCHAR(50),
        shift VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        capacity INT,
        type VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255)
    )`,
    `CREATE TABLE IF NOT EXISTS majors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        program_id INT
    )`,
    `CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        code VARCHAR(50),
        credit_hours INT,
        type VARCHAR(50),
        semester INT,
        major_id INT
    )`,
    `CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        major_id INT,
        semester INT,
        shift VARCHAR(50),
        intake VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS course_offerings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        section_id INT,
        program_id INT,
        major_id INT,
        semester INT,
        intake VARCHAR(50),
        academic_year VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS course_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        section_id INT,
        instructor_id INT,
        status VARCHAR(50),
        offering_id INT,
        semester INT,
        preferences JSON,
        accepted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS room_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT,
        section_id INT,
        time_slot_id INT,
        semester INT,
        offering_id INT
    )`,
    `CREATE TABLE IF NOT EXISTS slot_reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_request_id INT,
        instructor_id INT,
        time_slot_id INT,
        room_assignment_id INT,
        offering_id INT,
        status VARCHAR(50) DEFAULT 'reserved'
    )`,
    `CREATE TABLE IF NOT EXISTS blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT,
        course_id INT,
        section_id INT,
        room_id INT,
        day VARCHAR(50),
        time_slot_id INT,
        shift VARCHAR(50),
        type VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS section_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT,
        course_id INT,
        instructor_id INT,
        semester INT
    )`
];

async function setup() {
    let connection;
    try {
        console.log('Connecting to DB...');
        connection = await db.getConnection();
        console.log('Connected. Creating schema...');

        for (const query of schema) {
            await connection.query(query);
        }

        console.log('✅ Schema created successfully.');
    } catch (err) {
        console.error('❌ Schema creation failed:', err);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

setup();
