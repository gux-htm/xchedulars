# Xchedular - Complete System Structure

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
  <h2 style="color: white; margin: 0;">University Timetable Management System</h2>
  <p style="color: white; margin: 10px 0 0 0;">Complete Architecture and File Structure Documentation</p>
</div>

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Key Features](#key-features)
10. [File Descriptions](#file-descriptions)

---

## System Overview

Xchedular is a comprehensive university timetable management system that automates scheduling, resource allocation, instructor workload management, and exam scheduling using Block Theory algorithm.

### Architecture Pattern
```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js Frontend (React + TypeScript)       │   │
│  │  - Pages (Admin, Instructor, Student, Auth)              │   │
│  │  - Components (UI, Layout, Modals)                       │   │
│  │  - Context (Auth State Management)                       │   │
│  │  - Hooks (Custom React Hooks)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Express.js Backend (Node.js)                │   │
│  │  - Routes (API Endpoints)                                │   │
│  │  - Controllers (Business Logic)                          │   │
│  │  - Middleware (Auth, Validation, Security)               │   │
│  │  - Utils (Helpers, Email, PDF Generation)                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MySQL Protocol
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MySQL Database                        │   │
│  │  - Users, Programs, Majors, Courses                      │   │
│  │  - Sections, Rooms, Timetable Entries                    │   │
│  │  - Exams, Notifications, Audit Logs                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime Environment | 18+ |
| Express.js | Web Framework | 4.x |
| MySQL | Database | 8.x |
| JWT | Authentication | - |
| bcryptjs | Password Hashing | - |
| Nodemailer | Email Service | - |
| PDFKit | PDF Generation | - |
| Helmet | Security Headers | - |
| CORS | Cross-Origin Requests | - |
| Joi | Input Validation | - |

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React Framework | 14.x |
| React | UI Library | 18.x |
| TypeScript | Type Safety | 5.x |
| Tailwind CSS | Styling | 3.x |
| Framer Motion | Animations | - |
| Axios | HTTP Client | - |
| React Context | State Management | - |
| Lucide React | Icons | - |
| React Toastify | Notifications | - |

---

## Directory Structure

```
Xchedular/
│
├── backend/                          # Server-side application
│   ├── config/                       # Configuration files
│   │   └── db.js                     # Database connection
│   │
│   ├── controllers/                  # Business logic
│   │   ├── adminController.js        # Admin operations
│   │   ├── authController.js         # Authentication
│   │   ├── examController.js         # Exam management
│   │   ├── notificationController.js # Notifications
│   │   ├── offeringController.js     # Course offerings
│   │   ├── requestController.js      # Course requests
│   │   ├── roomController.js         # Room management
│   │   ├── studentController.js      # Student operations
│   │   ├── timetableController.js    # Timetable generation
│   │   └── timingController.js       # University timings
│   │
│   ├── middleware/                   # Express middleware
│   │   ├── auth.js                   # JWT authentication
│   │   └── validation.js             # Input validation
│   │
│   ├── routes/                       # API route definitions
│   │   ├── admin.js                  # Admin routes
│   │   ├── auth.js                   # Auth routes
│   │   ├── exam.js                   # Exam routes
│   │   ├── notificationRoutes.js     # Notification routes
│   │   ├── offerings.js              # Offering routes
│   │   ├── requestRoutes.js          # Request routes
│   │   ├── rooms.js                  # Room routes
│   │   ├── student.js                # Student routes
│   │   ├── timetable.js              # Timetable routes
│   │   └── timing.js                 # Timing routes
│   │
│   ├── utils/                        # Utility functions
│   │   ├── email.js                  # Email service (Resend)
│   │   ├── email-sendgrid.js         # SendGrid integration
│   │   ├── generateTimetableHTML.js  # HTML timetable generator
│   │   ├── generateTimetablePDF.js   # PDF timetable generator
│   │   ├── helpers.js                # Helper functions
│   │   └── securityLogger.js         # Security logging
│   │
│   ├── server.js                     # Express server entry
│   ├── package.json                  # Backend dependencies
│   ├── .env.development              # Dev environment
│   └── .env.test                     # Test environment
│
├── frontend/                         # Client-side application
│   ├── components/                   # React components
│   │   ├── ui/                       # UI components (shadcn)
│   │   ├── AnimatedButton.tsx        # Animated button
│   │   ├── AnimatedGhost.tsx         # Ghost animation
│   │   ├── ChangeInstructorModal.tsx # Instructor change modal
│   │   ├── Layout.tsx                # Main layout wrapper
│   │   ├── LoadingSpinner.tsx        # Loading indicators
│   │   ├── ProfileDropdown.tsx       # User profile dropdown
│   │   ├── RescheduleModal.tsx       # Reschedule modal
│   │   ├── SoundToggle.tsx           # Sound on/off toggle
│   │   ├── ThemeProvider.tsx         # Theme context
│   │   └── ThemeToggle.tsx           # Dark/light toggle
│   │
│   ├── context/                      # React context
│   │   └── AuthContext.tsx           # Authentication state
│   │
│   ├── hooks/                        # Custom React hooks
│   │   └── useSounds.ts              # Sound effects hook
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── animations.ts             # Animation variants
│   │   ├── api.ts                    # API client (Axios)
│   │   └── utils.ts                  # Utility functions
│   │
│   ├── pages/                        # Next.js pages
│   │   ├── admin/                    # Admin pages
│   │   │   ├── sections/             # Section management
│   │   │   │   └── [sectionName]/    # Dynamic routes
│   │   │   │       └── record.tsx    # Section records
│   │   │   ├── approvals.tsx         # User approvals
│   │   │   ├── CourseRequests.tsx    # Course requests
│   │   │   ├── courses.tsx           # Course management
│   │   │   ├── dashboard.tsx         # Admin dashboard
│   │   │   ├── exams.tsx             # Exam scheduling
│   │   │   ├── instructors.tsx       # Instructor management
│   │   │   ├── programs.tsx          # Program management
│   │   │   ├── rooms.tsx             # Room management
│   │   │   ├── sections.tsx          # Section management
│   │   │   ├── settings.tsx          # System settings
│   │   │   └── timetable.tsx         # Timetable generation
│   │   │
│   │   ├── instructor/               # Instructor pages
│   │   │   ├── dashboard.tsx         # Instructor dashboard
│   │   │   ├── requests.tsx          # Course requests
│   │   │   └── timetable.tsx         # Personal timetable
│   │   │
│   │   ├── _app.tsx                  # App wrapper
│   │   ├── index.tsx                 # Landing page
│   │   ├── login.tsx                 # Login page
│   │   ├── register.tsx              # Admin/Instructor register
│   │   ├── register-student.tsx      # Student registration
│   │   ├── forgot-password.tsx       # Password recovery
│   │   ├── reset-password.tsx        # Password reset
│   │   ├── update-password.tsx       # Password update
│   │   └── verify-otp.tsx            # OTP verification
│   │
│   ├── public/                       # Static assets
│   │   ├── sounds/                   # Sound effect files
│   │   └── timetables/               # Generated timetables
│   │
│   ├── styles/                       # CSS styles
│   │   └── globals.css               # Global styles
│   │
│   ├── next.config.js                # Next.js configuration
│   ├── tailwind.config.js            # Tailwind configuration
│   ├── tsconfig.json                 # TypeScript config
│   └── package.json                  # Frontend dependencies
│
├── database/                         # Database files
│   └── schema.sql                    # Database schema
│
├── .env                              # Environment variables
├── .env.example                      # Environment template
├── package.json                      # Root dependencies
├── start-servers.bat                 # Windows startup script
├── kill-ports.bat                    # Port cleanup script
└── README.md                         # Project documentation
```

---

## Backend Architecture

### Controllers

| Controller | Responsibility |
|------------|----------------|
| `authController.js` | User registration, login, password reset, OTP verification |
| `adminController.js` | CRUD for programs, majors, courses, sections, instructors |
| `timetableController.js` | Timetable generation using Block Theory algorithm |
| `examController.js` | Exam scheduling (Match & Shuffle modes) |
| `timingController.js` | University timing configuration |
| `roomController.js` | Room management and availability |
| `requestController.js` | Course request handling |
| `studentController.js` | Student-specific operations |
| `notificationController.js` | System notifications |
| `offeringController.js` | Course offerings management |

### Middleware

| Middleware | Purpose |
|------------|---------|
| `auth.js` | JWT token verification, role-based access control |
| `validation.js` | Input validation using Joi schemas |

### Routes Structure

```
/api
├── /auth
│   ├── POST /register              # User registration
│   ├── POST /login                 # User login
│   ├── GET  /profile               # Get user profile
│   ├── POST /forgot-password       # Request password reset
│   ├── POST /verify-otp            # Verify OTP
│   ├── POST /reset-password        # Reset password
│   └── GET  /check-first-admin     # Check if first admin exists
│
├── /admin
│   ├── GET  /dashboard/stats       # Dashboard statistics
│   ├── CRUD /programs              # Program management
│   ├── CRUD /majors                # Major management
│   ├── CRUD /courses               # Course management
│   ├── CRUD /sections              # Section management
│   ├── CRUD /instructors           # Instructor management
│   └── GET  /pending-registrations # Pending approvals
│
├── /timetable
│   ├── POST /generate-requests     # Generate course requests
│   ├── GET  /requests              # Get course requests
│   ├── POST /accept-request        # Accept course request
│   ├── POST /undo-acceptance       # Undo acceptance
│   ├── POST /generate              # Generate timetable
│   ├── GET  /                      # Get timetable
│   ├── POST /reschedule            # Reschedule class
│   └── POST /reset                 # Reset timetable
│
├── /exam
│   ├── POST /create                # Create exam
│   ├── POST /generate-schedule     # Generate exam schedule
│   ├── GET  /                      # Get exams
│   └── POST /reset                 # Reset exams
│
├── /rooms
│   ├── CRUD /                      # Room management
│   └── GET  /available             # Available rooms
│
├── /timing
│   ├── GET  /                      # Get university timings
│   └── POST /                      # Set university timings
│
└── /student
    ├── GET  /timetable             # Student timetable
    └── GET  /exams                 # Student exams
```

---

## Frontend Architecture

### Page Structure

```
Pages Hierarchy
│
├── Public Pages (No Auth Required)
│   ├── index.tsx                   # Landing page
│   ├── login.tsx                   # Login form
│   ├── register.tsx                # Registration form
│   ├── register-student.tsx        # Student registration
│   ├── forgot-password.tsx         # Password recovery
│   ├── reset-password.tsx          # Password reset
│   ├── update-password.tsx         # Password update
│   └── verify-otp.tsx              # OTP verification
│
├── Admin Pages (Admin Role Required)
│   ├── dashboard.tsx               # Statistics & overview
│   ├── programs.tsx                # Program CRUD
│   ├── courses.tsx                 # Course CRUD
│   ├── sections.tsx                # Section CRUD
│   ├── instructors.tsx             # Instructor CRUD
│   ├── rooms.tsx                   # Room CRUD
│   ├── approvals.tsx               # User approval
│   ├── CourseRequests.tsx          # Course request management
│   ├── timetable.tsx               # Timetable generation
│   ├── exams.tsx                   # Exam scheduling
│   └── settings.tsx                # System settings
│
└── Instructor Pages (Instructor Role Required)
    ├── dashboard.tsx               # Personal overview
    ├── requests.tsx                # Course acceptance
    └── timetable.tsx               # Personal timetable
```

### Component Architecture

```
Components
│
├── Layout Components
│   ├── Layout.tsx                  # Main layout with sidebar
│   ├── ProfileDropdown.tsx         # User menu
│   └── ThemeToggle.tsx             # Dark/light mode
│
├── UI Components (shadcn/ui)
│   ├── Button                      # Styled buttons
│   ├── Card                        # Card containers
│   ├── Dialog                      # Modal dialogs
│   ├── Input                       # Form inputs
│   ├── Select                      # Dropdown selects
│   ├── Table                       # Data tables
│   └── Toast                       # Notifications
│
├── Feature Components
│   ├── RescheduleModal.tsx         # Class rescheduling
│   ├── ChangeInstructorModal.tsx   # Instructor change
│   └── AnimatedGhost.tsx           # Login animation
│
└── Utility Components
    ├── LoadingSpinner.tsx          # Loading states
    ├── AnimatedButton.tsx          # Animated buttons
    └── SoundToggle.tsx             # Sound control
```

### State Management

```
Context Providers
│
├── AuthContext
│   ├── user                        # Current user data
│   ├── token                       # JWT token
│   ├── login()                     # Login function
│   ├── logout()                    # Logout function
│   └── isAuthenticated             # Auth status
│
└── ThemeProvider
    ├── theme                       # Current theme
    └── toggleTheme()               # Theme toggle
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   USERS     │     │  PROGRAMS   │     │   MAJORS    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ name        │     │ name        │     │ name        │
│ email       │     │ shift       │     │ program_id  │──┐
│ password    │     │ duration    │     └─────────────┘  │
│ role        │     └─────────────┘                      │
│ department  │            │                             │
│ status      │            │                             │
└─────────────┘            │                             │
       │                   │                             │
       │                   ▼                             │
       │         ┌─────────────┐                         │
       │         │  SECTIONS   │◄────────────────────────┘
       │         ├─────────────┤
       │         │ id (PK)     │
       │         │ name        │
       │         │ program_id  │
       │         │ major_id    │
       │         │ semester    │
       │         │ capacity    │
       │         └─────────────┘
       │                │
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────────┐  ┌─────────────┐
│  COURSES    │  │ COURSE_REQUESTS │  │    ROOMS    │
├─────────────┤  ├─────────────────┤  ├─────────────┤
│ id (PK)     │  │ id (PK)         │  │ id (PK)     │
│ code        │  │ course_id       │  │ name        │
│ name        │  │ section_id      │  │ capacity    │
│ credit_hrs  │  │ instructor_id   │  │ type        │
│ type        │  │ status          │  │ building    │
└─────────────┘  │ preferred_days  │  └─────────────┘
       │         │ preferred_slots │         │
       │         └─────────────────┘         │
       │                │                    │
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────┐
│                 TIMETABLE_ENTRIES               │
├─────────────────────────────────────────────────┤
│ id (PK)                                         │
│ course_id (FK)                                  │
│ section_id (FK)                                 │
│ instructor_id (FK)                              │
│ room_id (FK)                                    │
│ day                                             │
│ time_slot                                       │
│ shift                                           │
└─────────────────────────────────────────────────┘
```

### Tables Overview

| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | All system users | id, name, email, password, role, status |
| `programs` | Academic programs | id, name, shift, duration |
| `majors` | Program majors | id, name, program_id |
| `courses` | Course catalog | id, code, name, credit_hours, type |
| `sections` | Class sections | id, name, program_id, major_id, semester |
| `rooms` | Physical rooms | id, name, capacity, type, building |
| `course_requests` | Instructor requests | id, course_id, instructor_id, status |
| `timetable_entries` | Schedule entries | id, course_id, room_id, day, time_slot |
| `exams` | Exam schedule | id, course_id, date, time, room_id |
| `university_timings` | System timings | opening_time, closing_time, slot_duration |
| `notifications` | User notifications | id, user_id, message, read_status |
| `audit_logs` | Security logs | id, user_id, action, timestamp |

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN                               │
│  - Full system access                                       │
│  - User management (approve/reject)                         │
│  - Academic structure (programs, courses, sections)         │
│  - Timetable generation                                     │
│  - Exam scheduling                                          │
│  - System settings                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       INSTRUCTOR                            │
│  - View assigned courses                                    │
│  - Accept/reject course requests                            │
│  - Set availability preferences                             │
│  - View personal timetable                                  │
│  - Reschedule classes (with approval)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        STUDENT                              │
│  - View section timetable                                   │
│  - View exam schedule                                       │
│  - Receive notifications                                    │
│  - Download timetable (PDF/HTML)                            │
└─────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Feature | Admin | Instructor | Student |
|---------|-------|------------|---------|
| Dashboard | Full Stats | Personal Stats | Section Info |
| Programs | CRUD | View | - |
| Courses | CRUD | View | - |
| Sections | CRUD | View | View Own |
| Rooms | CRUD | View | - |
| Instructors | CRUD | View Self | - |
| Course Requests | Generate | Accept/Reject | - |
| Timetable | Generate/Reset | View/Reschedule | View |
| Exams | Schedule | View | View |
| Approvals | Approve/Reject | - | - |
| Settings | Configure | - | - |

---

## Key Features

### 1. Block Theory Timetable Generation

```
BLOCK = {
  Teacher,
  Course,
  Section,
  Room,
  Day,
  Time Slot,
  Shift
}

Conflict Rules:
- No teacher double-booking
- No section double-booking
- No room double-booking (same shift)
- Lab courses require lab rooms
- Room capacity >= section size
```

### 2. Authentication Flow

```
Registration → Admin Approval → Login → JWT Token → Protected Routes
     │              │              │         │            │
     ▼              ▼              ▼         ▼            ▼
  Pending      Approved/       Validate   Store in    Middleware
  Status       Rejected       Credentials  Cookie     Verification
```

### 3. Course Request Workflow

```
Admin Generates    Instructor     Instructor Sets    Admin Generates
Course Requests → Views Requests → Preferences → Timetable
       │               │               │              │
       ▼               ▼               ▼              ▼
   Pending         Available       Accepted      Scheduled
   Status          Courses         Status        Entries
```

### 4. Exam Scheduling Modes

```
Match Mode:
- Exams scheduled in same room as regular classes
- Maintains consistency for students

Shuffle Mode:
- Exams distributed across available rooms
- Optimizes room utilization
```

---

## File Descriptions

### Backend Files

| File | Description |
|------|-------------|
| `server.js` | Express server entry point, middleware setup |
| `config/db.js` | MySQL connection pool configuration |
| `controllers/*.js` | Business logic for each feature |
| `routes/*.js` | API endpoint definitions |
| `middleware/auth.js` | JWT verification, role checking |
| `middleware/validation.js` | Request body validation |
| `utils/email.js` | Email sending via Resend API |
| `utils/helpers.js` | Common utility functions |
| `utils/generateTimetablePDF.js` | PDF generation for timetables |
| `utils/generateTimetableHTML.js` | HTML generation for timetables |
| `utils/securityLogger.js` | Security event logging |

### Frontend Files

| File | Description |
|------|-------------|
| `pages/_app.tsx` | App wrapper with providers |
| `pages/index.tsx` | Landing page |
| `pages/login.tsx` | Login form with validation |
| `pages/register.tsx` | Registration form |
| `pages/admin/*.tsx` | Admin panel pages |
| `pages/instructor/*.tsx` | Instructor panel pages |
| `components/Layout.tsx` | Main layout with sidebar |
| `components/ui/*.tsx` | Reusable UI components |
| `context/AuthContext.tsx` | Authentication state |
| `hooks/useSounds.ts` | Sound effects hook |
| `lib/api.ts` | Axios API client |
| `lib/animations.ts` | Framer Motion variants |
| `styles/globals.css` | Global CSS with Tailwind |

### Configuration Files

| File | Description |
|------|-------------|
| `.env` | Environment variables |
| `package.json` | Project dependencies |
| `tailwind.config.js` | Tailwind CSS configuration |
| `next.config.js` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |

---

## Quick Reference

### Start Development

```bash
# Install dependencies
npm run install:all

# Start both servers
npm run dev

# Or start separately
cd backend && npm run dev
cd frontend && npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health Check | http://localhost:5000/api/health |

### Default Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 5000 |
| MySQL | 3306 |

---

<div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <p style="color: white; font-size: 1.1em; margin: 0;"><strong>Xchedular System Structure Documentation</strong></p>
  <p style="color: white; margin: 10px 0 0 0;">Version 1.0.0 | Last Updated: December 2024</p>
</div>

---

**Maintained By**: Xchedular Development Team
