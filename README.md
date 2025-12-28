# EmersonSched - University Timetable Management System

EmersonSched is a comprehensive university timetable management system designed to automate scheduling, resource allocation, instructor workload management, and exam scheduling using a Block Theory algorithm.

## Features

*   **Block Theory Timetable Generation:** Automates scheduling with conflict resolution (teacher, section, room double-booking checks).
*   **Role-Based Access Control:** Distinct portals for Admins, Instructors, and Students.
*   **Course Request Workflow:** Instructors can view available courses and set preferences.
*   **Exam Scheduling:** Supports 'Match Mode' (exams in regular class rooms) and 'Shuffle Mode' (distributed exams).
*   **Room Management:** Manage physical rooms, capacities, and types.
*   **Notifications:** System-wide notifications for users.

## Technology Stack

### Backend
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MySQL
*   **Authentication:** JWT (JSON Web Tokens)
*   **Email:** Nodemailer / Resend

### Frontend
*   **Framework:** Next.js (React)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **State Management:** React Context
*   **HTTP Client:** Axios

## Prerequisites

*   Node.js (v18 or higher recommended)
*   MySQL Server

## Setup Instructions

### 1. Database Setup

1.  Create a MySQL database named `university_timetable`.
2.  **Note:** The schema file `database/schema.sql` is referenced in the project structure but may be missing from the repository. You can recreate the database based on the Entity Relationship Diagram below:

    *   **Users:** `id`, `name`, `email`, `password`, `role`, `department`, `status`
    *   **Programs:** `id`, `name`, `shift`, `duration`
    *   **Majors:** `id`, `name`, `program_id`
    *   **Courses:** `id`, `code`, `name`, `credit_hrs`, `type`
    *   **Sections:** `id`, `name`, `program_id`, `major_id`, `semester`, `capacity`
    *   **Rooms:** `id`, `name`, `capacity`, `type`, `building`
    *   **Course Requests:** `id`, `course_id`, `section_id`, `instructor_id`, `status`
    *   **Timetable Entries:** `id`, `course_id`, `section_id`, `instructor_id`, `room_id`, `day`, `time_slot`
    *   **Exams:** `id`, `course_id`, `date`, `time`, `room_id`

### 2. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    *   Create a `.env` file in the `backend/` directory.
    *   You can copy the content from `.env.development`:
        ```env
        DB_HOST=localhost
        DB_USER=root
        DB_PASS=your_password
        DB_NAME=university_timetable
        PORT=5000
        JWT_SECRET=your_jwt_secret_key_here
        NODE_ENV=development
        ```
    *   Update `DB_PASS` with your MySQL password.

4.  Start the server:
    ```bash
    npm run dev
    ```
    The backend API will run on `http://localhost:5000`.

### 3. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    *   Create a `.env.local` file in the `frontend/` directory.
    *   Add the API URL:
        ```env
        NEXT_PUBLIC_API_URL=http://localhost:5000/api
        ```

4.  Start the application:
    ```bash
    npm run dev
    ```
    The frontend will run on `http://localhost:3000`.

## Project Structure

*   `backend/`: Express.js server, API routes, controllers, and database configuration.
*   `frontend/`: Next.js application, React components, pages, and styles.
*   `STRUCTURE.md`: Detailed documentation of the system architecture and file descriptions.

## Usage

*   **Admin:** Log in to manage programs, courses, rooms, and generate timetables.
*   **Instructor:** Log in to view requests, set preferences, and view personal schedules.
*   **Student:** Log in to view class and exam schedules.

For more detailed information, please refer to the `STRUCTURE.md` file.
