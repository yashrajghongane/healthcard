# HealthCard Architecture & Components

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              FRONTEND (index.html)                         │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  HTML Structure:                                     │ │  │
│  │  │  • Header with logo                                  │ │  │
│  │  │  • Hero section with buttons                         │ │  │
│  │  │  • Login modal (hidden by default)                   │ │  │
│  │  │  • Features section                                  │ │  │
│  │  │  • Workflow section                                  │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  JavaScript Logic:                                   │ │  │
│  │  │  • Toggle login modal                                │ │  │
│  │  │  • Form validation                                   │ │  │
│  │  │  • Call login() function                             │ │  │
│  │  │  • Store JWT token in localStorage                   │ │  │
│  │  │  • Redirect to dashboard                             │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           REGISTER PAGE (register.html)                    │  │
│  │  • Full Name input                                        │  │
│  │  • Email input                                           │  │
│  │  • Password input                                        │  │
│  │  • Role toggle (Patient/Doctor)                          │  │
│  │  • License field (shown for doctors only)                │  │
│  │  • Form submission calls registerUser()                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         PATIENT DASHBOARD (dashboards/patient.html)        │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Header: Patient name + Logout button              │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Health Card Display:                               │ │  │
│  │  │  • Name, Card ID, Blood Group                       │ │  │
│  │  │  • DOB, Allergies, Status                           │ │  │
│  │  │  • QR Code (contains card ID)                       │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Medical History Timeline:                           │ │  │
│  │  │  • List of all visits                                │ │  │
│  │  │  • Date, Doctor, Clinic, Notes                       │ │  │
│  │  │  • Newest visit highlighted                          │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │          DOCTOR DASHBOARD (dashboards/doctor.html)         │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Header: Doctor name + Logout button               │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Patient Search:                                     │ │  │
│  │  │  • Input: Patient Card ID (HC-XXXX-XXXX)           │ │  │
│  │  │  • Calls searchPatient(cardId)                       │ │  │
│  │  │  • Returns patient details if found                  │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Patient Workspace (shows after search):             │ │  │
│  │  │  ┌────────────────────────────────────────────────┐ │ │  │
│  │  │  │  Patient Card:                                 │ │ │  │
│  │  │  │  • Name, Card ID, Blood Group, DOB, Allergies │ │ │  │
│  │  │  │  • Patient medical history timeline            │ │ │  │
│  │  │  └────────────────────────────────────────────────┘ │ │  │
│  │  │  ┌────────────────────────────────────────────────┐ │ │  │
│  │  │  │  Add Medical Record Form:                       │ │ │  │
│  │  │  │  • Textarea for medical notes                   │ │ │  │
│  │  │  │  • Calls addMedicalRecord() on submit           │ │ │  │
│  │  │  │  • Shows success message                        │ │ │  │
│  │  │  └────────────────────────────────────────────────┘ │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         │                                    │
         │ (HTTP Requests with JWT Token)     │
         │                                    │
         └────────────────────┬───────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────────┐
         │            BACKEND SERVER                      │
         │      (localhost:5000, Node.js + Express)      │
         ├────────────────────────────────────────────────┤
         │                                                │
         │  ┌──────────────────────────────────────────┐ │
         │  │  server.js (Express App)                 │ │
         │  │  ├─ CORS setup                           │ │
         │  │  ├─ JSON body parser                     │ │
         │  │  ├─ Route mounting                       │ │
         │  │  ├─ Error handling                       │ │
         │  │  └─ Port 5000 listener                   │ │
         │  └──────────────────────────────────────────┘ │
         │                                                │
         │  ┌──────────────────────────────────────────┐ │
         │  │  routes/auth.js (API Endpoints)          │ │
         │  │  ├─ POST /api/auth/register              │ │
         │  │  ├─ POST /api/auth/login                 │ │
         │  │  ├─ GET /api/auth/me                     │ │
         │  │  ├─ POST /api/auth/logout                │ │
         │  │  └─ Input validation for each            │ │
         │  └──────────────────────────────────────────┘ │
         │                                                │
         │  ┌──────────────────────────────────────────┐ │
         │  │  controllers/authController.js            │ │
         │  │  ├─ register() function                   │ │
         │  │  │  ├─ Validate input                     │ │
         │  │  │  ├─ Check if user exists               │ │
         │  │  │  ├─ Generate card ID (patients)        │ │
         │  │  │  ├─ Create User document               │ │
         │  │  │  ├─ Hash password                       │ │
         │  │  │  ├─ Generate JWT token                 │ │
         │  │  │  └─ Return user + token                │ │
         │  │  │                                        │ │
         │  │  ├─ login() function                      │ │
         │  │  │  ├─ Validate input                     │ │
         │  │  │  ├─ Find user by email                 │ │
         │  │  │  ├─ Compare passwords                  │ │
         │  │  │  ├─ Verify role                        │ │
         │  │  │  ├─ Generate JWT token                 │ │
         │  │  │  └─ Return user + token                │ │
         │  │  │                                        │ │
         │  │  ├─ getCurrentUser() function             │ │
         │  │  │  ├─ Extract user ID from token         │ │
         │  │  │  ├─ Find user in database              │ │
         │  │  │  └─ Return user data                   │ │
         │  │  │                                        │ │
         │  │  └─ logout() function                     │ │
         │  │     └─ Return success message             │ │
         │  └──────────────────────────────────────────┘ │
         │                                                │
         │  ┌──────────────────────────────────────────┐ │
         │  │  middleware/auth.js (JWT Verification)   │ │
         │  │  ├─ Extract token from header            │ │
         │  │  ├─ Verify signature                      │ │
         │  │  ├─ Check expiration                      │ │
         │  │  ├─ Attach user to request                │ │
         │  │  └─ Or return 401 Unauthorized            │ │
         │  └──────────────────────────────────────────┘ │
         │                                                │
         │  ┌──────────────────────────────────────────┐ │
         │  │  models/User.js (MongoDB Schema)         │ │
         │  │  Fields:                                 │ │
         │  │  • fullname (String)                     │ │
         │  │  • email (String, unique)                │ │
         │  │  • password (String, hashed)             │ │
         │  │  • role (patient/doctor)                 │ │
         │  │  • license (doctors only)                │ │
         │  │  • cardId (patients only)                │ │
         │  │  • createdAt, updatedAt                  │ │
         │  │                                          │ │
         │  │  Methods:                                │ │
         │  │  • comparePassword()                     │ │
         │  │  • Pre-save hooks for:                   │ │
         │  │    - Password hashing                    │ │
         │  │    - Card ID generation                  │ │
         │  └──────────────────────────────────────────┘ │
         │                                                │
         └────────────────────┬───────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────────┐
         │          MONGODB DATABASE                      │
         │     (localhost:27017/healthcard)               │
         ├────────────────────────────────────────────────┤
         │                                                │
         │  Database: healthcard                          │
         │  │                                             │
         │  └─ Collection: users                          │
         │     │                                          │
         │     └─ Documents:                              │
         │        {                                       │
         │          "_id": ObjectId,                      │
         │          "fullname": "John Doe",               │
         │          "email": "john@example.com",          │
         │          "password": "$2a$10$...(hashed)",     │
         │          "role": "patient",                    │
         │          "cardId": "HC-1234-5678",             │
         │          "createdAt": ISODate,                 │
         │          "updatedAt": ISODate                  │
         │        }                                       │
         │                                                │
         └────────────────────────────────────────────────┘
```

---

## Request-Response Flow Examples

### Example 1: User Registration

```
FRONTEND REQUEST:
POST /api/auth/register
Content-Type: application/json

{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient"
}

        │
        ▼

BACKEND PROCESSING:
1. Validate input (express-validator)
2. Check if user exists (MongoDB query)
3. Create new User document:
   - fullname: "John Doe"
   - email: "john@example.com"
   - password: "password123" (will be hashed)
   - role: "patient"
4. Pre-save hook triggers:
   - Hash password with bcryptjs
   - Generate cardId: "HC-1234-5678"
5. Save to MongoDB
6. Generate JWT token
7. Build response object

        │
        ▼

FRONTEND RESPONSE:
HTTP 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "cardId": "HC-1234-5678",
    "createdAt": "2024-02-20T10:00:00.000Z"
  }
}

        │
        ▼

FRONTEND HANDLING:
1. Store token in localStorage
2. Store user data in localStorage
3. Redirect to dashboard or login page
```

---

### Example 2: User Login

```
FRONTEND REQUEST:
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "role": "patient"
}

        │
        ▼

BACKEND PROCESSING:
1. Validate input
2. Find user by email in MongoDB
3. Check if user exists
4. Check if role matches
5. Compare password using bcryptjs:
   - bcryptjs.compare("password123", "$2a$10$...hash")
   - Returns true/false
6. If valid:
   - Generate JWT token with:
     * Payload: {id, email, role}
     * Secret: JWT_SECRET
     * Expiry: 7 days
   - Build response

        │
        ▼

FRONTEND RESPONSE:
HTTP 200 OK

{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "cardId": "HC-1234-5678",
    "createdAt": "2024-02-20T10:00:00.000Z"
  }
}

        │
        ▼

FRONTEND HANDLING:
1. Store token in localStorage
2. Redirect to patient dashboard
3. Initialize patient dashboard with token
```

---

### Example 3: Protected Route (Get Current User)

```
FRONTEND REQUEST:
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

        │
        ▼

BACKEND MIDDLEWARE (verifyToken):
1. Extract token from Authorization header
   "Bearer <token>" → split → get token
2. Verify token using:
   jwt.verify(token, JWT_SECRET)
3. If valid:
   - Decode payload: {id, email, role}
   - Attach to req.user
   - Call next()
4. If invalid:
   - Return 401 Unauthorized
   - Return error message

        │
        ▼

BACKEND CONTROLLER (if verified):
1. Get user ID from req.user.id
2. Query MongoDB for user
3. Return user data (no password)

        │
        ▼

FRONTEND RESPONSE:
HTTP 200 OK

{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "cardId": "HC-1234-5678",
    "createdAt": "2024-02-20T10:00:00.000Z"
  }
}
```

---

## Component Interaction Map

```
┌──────────────────────────────────────┐
│      FRONTEND COMPONENTS             │
└──────────────────────────────────────┘
        │                    │
        │                    │
   auth.js ←────────────┐ api.js
   (Auth logic)         │ (Data management)
        │                    │
        ├────────────────────┤
        │                    │
        ▼                    ▼
   index.html ←→ register.html
   (Login)        (Registration)
        │                    │
        │     ┌──────────────┘
        │     │
        ▼     ▼
   patient.js   doctor.js
        │           │
        ▼           ▼
   patient.html  doctor.html
   (Dashboard)   (Dashboard)

Supports:
• Patient QR code + health card
• Medical history timeline
• Doctor patient search
• Add medical records
```

---

## Authentication Flow Sequence

```
User Action                Server Processing           Storage/DB
═════════════════════════════════════════════════════════════════════

User enters
credentials
   │
   ▼
POST /register
   │──────────────────────►  Validate input
                                │
                                ▼
                            Check if exists
                                │
                                ├─ Yes → 409 Conflict
                                │
                                ▼
                            Hash password
                            Create user
                                │
                                ▼
                            ──────────────► MongoDB: save user
                                │
                                ▼
                            Generate JWT
                                │
          ◄──────────────────  Token response
   │
   ▼
Store token &
redirect


User logs in
   │
   ▼
POST /login
   │──────────────────────►  Find user by email
                                │
                                ├─ Not found → 401
                                │
                                ▼
                            Compare passwords
                                │
                                ├─ Wrong → 401
                                │
                                ▼
                            Generate JWT
                                │
          ◄──────────────────  Token response
   │
   ▼
Store token
Redirect to dashboard


Access protected route
   │
   ▼
GET /api/auth/me
+ Authorization: Bearer token
   │──────────────────────►  Extract token
                                │
                                ▼
                            Verify signature
                                │
                                ├─ Invalid → 401
                                ├─ Expired → 401
                                │
                                ▼
                            Decode payload
                                │
                                ▼
                            Fetch user data
                                │
                                ▼
                            ──────────────► MongoDB: query user
                                │
          ◄──────────────────  User response
   │
   ▼
Display user info
```

---

## Data Format Standards

### User Document (MongoDB)
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  fullname: "John Doe",
  email: "john@example.com",
  password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  role: "patient",
  license: null,
  cardId: "HC-1234-5678",
  createdAt: ISODate("2024-02-20T10:00:00.000Z"),
  updatedAt: ISODate("2024-02-20T10:00:00.000Z")
}
```

### JWT Token Payload
```javascript
{
  id: "507f1f77bcf86cd799439011",
  email: "john@example.com",
  role: "patient",
  iat: 1708419600,  // issued at
  exp: 1709024400   // expiration (7 days)
}
```

### API Response Format
```javascript
{
  success: true|false,
  message: "Descriptive message",
  token: "JWT token (for auth endpoints)",
  user: { /* user data */ },
  error: "Error details (dev only)"
}
```

---

This completes the comprehensive architecture and component documentation!
