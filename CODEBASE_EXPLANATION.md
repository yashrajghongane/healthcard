# HealthCard - Complete Codebase Explanation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Frontend Code Explanation](#frontend-code-explanation)
4. [Backend Code Explanation](#backend-code-explanation)
5. [Data Flow](#data-flow)
6. [File Structure](#file-structure)

---

## Project Overview

**HealthCard** is a digital health identity platform that allows patients to maintain a unified health record (stored on a secure QR-based card) and enables doctors to access and update patient information.

### Key Features:
- ✅ User Registration (Patient/Doctor)
- ✅ Secure Login with JWT Authentication
- ✅ Role-based Dashboards
- ✅ Patient Health Card with QR Code
- ✅ Doctor Patient Search & Record Management
- ✅ Medical History Timeline
- ✅ Responsive UI with Tailwind CSS

### Tech Stack:
- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **Backend**: Node.js + Express + MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs (salted hashing)
- **Validation**: express-validator

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               FRONTEND (Client)                     │
│  HTML + CSS(Tailwind) + Vanilla JavaScript         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  index.html (Home + Login Modal)                   │
│  register.html (Registration Page)                 │
│  dashboards/patient.html (Patient Dashboard)       │
│  dashboards/doctor.html (Doctor Dashboard)         │
│                                                     │
│  assets/js/                                        │
│  ├─ auth.js (Client Auth Logic)                   │
│  ├─ api.js (Data Management - localStorage)       │
│  ├─ patient.js (Patient Dashboard Logic)          │
│  └─ doctor.js (Doctor Dashboard Logic)            │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │ (REST API Calls to Backend)
                   │ (Headers: Authorization: Bearer JWT)
┌──────────────────▼──────────────────────────────────┐
│               BACKEND (Server)                      │
│          Node.js + Express + MongoDB               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  server.js (Express App Entry Point)               │
│  config/db.js (MongoDB Connection)                 │
│  routes/auth.js (API Routes)                       │
│  controllers/authController.js (Business Logic)    │
│  models/User.js (MongoDB Schema + Methods)         │
│  middleware/auth.js (JWT Verification)             │
│                                                     │
└─────────────────────────────────────────────────────┘
         │
         ▼
    MongoDB Database
```

---

## Frontend Code Explanation

### **1. index.html** - Home Page & Login Modal

**Purpose**: Landing page with hero section and login modal

**Key Elements**:
- Header with HealthCard branding
- Hero section with call-to-action buttons
- Hero section (login button → opens modal)
- Login modal with role selection (patient/doctor)
- Features section
- Workflow section

**JavaScript Logic**:
- Opens login modal when "Login" or "Get Started" button is clicked
- Closes modal when close button or outside area is clicked
- Form submission validates email, password, and role
- Calls `login()` function from auth.js
- Redirects to appropriate dashboard based on role

**Flow**:
```
1. User enters email and password
2. User selects role (patient/doctor)
3. Form submitted → calls login(email, password, role)
4. If successful → redirects to dashboards/patient.html or dashboards/doctor.html
5. If failed → shows alert with error message
```

---

### **2. register.html** - Registration Page

**Purpose**: Allow new users to create accounts

**Key Features**:
- Full name input
- Email input
- Password input
- Role selection (patient/doctor toggle)
- Doctor-specific field: Medical License Number (hidden for patients)
- Form validation

**JavaScript Logic**:
```javascript
toggleRoleFields()
  // Shows/hides doctor license field based on selected role
  // Changes button text: "Register" for patients, "Register as Doctor" for doctors
  // Makes license field required for doctors

registerForm.addEventListener('submit', ...)
  // Validates all inputs
  // Calls registerUser(userData) from api.js
  // If successful → shows alert and redirects to index.html
  // If failed → shows error message
```

**Data Structure Sent to Backend**:
```json
{
  "fullname": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "password123",
  "role": "patient",
  "license": null  // Only for doctors
}
```

---

### **3. dashboards/patient.html** - Patient Dashboard

**Purpose**: Display patient health card, QR code, and medical history

**Key Sections**:
1. **Header**: Patient name, logout button
2. **Health Card**: 
   - Patient name and card ID
   - Blood group, DOB, Allergies
   - QR code (clickable, shows card ID)
3. **Medical History Timeline**: Chronological list of visits/consultations

**JavaScript Initialization** (`initPatientDashboard()`):
```javascript
1. Call requireAuth() → ensures user is logged in
2. Get current user from localStorage
3. Verify user role is 'patient'
4. Get patient data using getPatientByCardId()
5. Populate header with patient name
6. Fill card details (blood group, DOB, allergies)
7. Generate QR code using QRCode library
8. Render medical history timeline
```

**Data Rendering**:
- Card ID automatically generated during registration
- QR code contains only the card ID (HC-XXXX-XXXX)
- Timeline shows doctor visits with:
  - Date and time
  - Doctor name
  - Clinic name
  - Medical notes

---

### **4. dashboards/doctor.html** - Doctor Dashboard

**Purpose**: Search patients and add medical records

**Key Sections**:
1. **Header**: Doctor name, logout button
2. **Search Form**: Input for patient card ID
3. **Patient Workspace** (hidden until search):
   - Patient card info (name, ID, blood group, DOB, allergies)
   - Timeline of medical records
   - Add Record Form

**JavaScript Initialization** (`initDoctorDashboard()`):
```javascript
1. Call requireAuth() → ensures user is logged in
2. Get current user (doctor) from localStorage
3. Verify user role is 'doctor'
4. Populate header with doctor name
5. Setup search form listener
6. Setup add record form listener
```

**Search Flow**:
```javascript
searchPatient(cardId)
  1. Call getPatientByCardId(cardId)
  2. If found:
     - Populate patient details
     - Render patient's medical history
     - Show patient workspace
  3. If not found:
     - Show error message
     - Hide patient workspace
```

**Add Record Flow**:
```javascript
setupAddRecordForm()
  1. Validate medical notes input
  2. Create newRecord object:
     {
       doctor: currentUser.fullname,
       clinic: 'HealthCard Clinic',
       notes: enteredNotes,
       date: current date,
       time: current time
     }
  3. Call addMedicalRecord(patientId, newRecord)
  4. Re-render timeline with updated history
  5. Clear form
  6. Show success message
```

---

### **5. assets/js/auth.js** - Client Authentication

**Purpose**: Handle login, logout, session management (client-side)

**Key Functions**:

#### `initializeDefaultUsers()`
Initializes localStorage with default test users on first load

**Default Users**:
```
Patient:
  Email: patient@example.com
  Password: password
  Role: patient

Doctor:
  Email: doctor@example.com
  Password: password
  Role: doctor
```

#### `login(email, password, role)`
Validates credentials against localStorage 'users' object

```javascript
function login(email, password, role) {
  1. Get users from localStorage
  2. Check if user exists with provided email
  3. Verify password matches
  4. Verify role matches
  5. Store current user in localStorage['currentUser']
  6. Return { success: true, user: ... }
}
```

#### `logout()`
Clears session and redirects to home

```javascript
function logout() {
  1. Remove 'currentUser' from localStorage
  2. Redirect to ../index.html
}
```

#### `getCurrentUser()`
Returns currently logged-in user object

#### `isLoggedIn()`
Boolean check if user is logged in

#### `requireAuth()`
Called on dashboard pages to protect routes
- If not logged in → redirects to index.html
- If wrong role → redirects to index.html

---

### **6. assets/js/api.js** - Data Management

**Purpose**: Handle user registration, patient data, medical records (localStorage as JSON database)

**Storage Structure**:
```javascript
localStorage['users'] = {
  'email@example.com': {
    fullname: 'Name',
    email: 'email@example.com',
    password: 'hashed_password',
    role: 'patient|doctor',
    cardId: 'HC-1234-5678',
    license: 'MED-123456'
  }
}

localStorage['patientsDB'] = {
  'HC-1234-5678': {
    cardId: 'HC-1234-5678',
    name: 'Patient Name',
    dob: '2000-01-01',
    bloodGroup: 'O+',
    allergies: 'None',
    history: [
      {
        doctor: 'Dr. Name',
        clinic: 'Clinic Name',
        date: '2024-02-20',
        time: '10:30',
        notes: 'Consultation notes...'
      }
    ]
  }
}
```

**Key Functions**:

#### `registerUser(userData)`
Creates new user account
- Generates unique card ID for patients
- Stores in localStorage
- Creates patient record in patientsDB

#### `generateCardId()`
Generates unique ID: `HC-XXXX-XXXX`

#### `getPatientByCardId(cardId)`
Retrieves patient data from patientsDB

#### `updatePatientData(cardId, data)`
Updates patient information (blood group, DOB, allergies)

#### `addMedicalRecord(cardId, record)`
Adds medical visit to patient's history
- Prepends newest record (appears first in timeline)
- Returns updated history

---

### **7. assets/js/patient.js** - Patient Dashboard Logic

**Purpose**: Handle patient dashboard initialization and rendering

**Key Functions**:

#### `initPatientDashboard()`
```javascript
1. Check authentication (requireAuth())
2. Get patient data
3. Populate header with patient name
4. Fill card details
5. Generate QR code
6. Populate medical history timeline
```

#### `generateQRCode(cardId)`
Uses QRCode.js library to generate QR code

**QR Code Details**:
```javascript
new QRCode(element, {
  text: cardId,          // Only contains card ID
  width: 90,
  height: 90,
  colorDark: "#020617",  // slate-950
  colorLight: "#ffffff"
});
```

#### `populateTimeline(history)`
Renders medical history as timeline
- Highlights newest visit in green
- Shows date, time, doctor, clinic, notes

---

### **8. assets/js/doctor.js** - Doctor Dashboard Logic

**Purpose**: Handle doctor dashboard (search, view records, add records)

**Key Functions**:

#### `initDoctorDashboard()`
```javascript
1. Check authentication (requireAuth())
2. Verify role is 'doctor'
3. Populate header with doctor name
4. Setup search form
5. Setup add record form
```

#### `searchPatient(cardId)`
```javascript
1. Get patient from patientsDB using cardId
2. Populate patient details in UI
3. Render patient's medical history
4. Show patient workspace (initially hidden)
5. Or show error if patient not found
```

#### `renderTimeline(historyArray)`
Renders medical visits as timeline
- Similar to patient.js but shows doctor's name
- Most recent visit highlighted in emerald green

#### `setupAddRecordForm()`
```javascript
1. Create new record object with:
   - doctor: current doctor's name
   - clinic: 'HealthCard Clinic'
   - notes: entered text
   - date/time: auto-added
2. Call addMedicalRecord()
3. Re-render timeline
4. Clear form
5. Show success message
```

---

## Backend Code Explanation

### **1. server.js** - Express Application Entry Point

**Purpose**: Initialize Express app, middleware, routes, error handling

**Setup Process**:
```javascript
1. Load environment variables from .env
2. Connect to MongoDB
3. Apply middleware:
   - CORS (allow cross-origin requests)
   - JSON body parser
   - URL-encoded parser
4. Mount route handlers
5. Add health check endpoint
6. Add 404 handler
7. Add global error handler
8. Start server on PORT
```

**Key Middleware**:
- `cors()` - Allow frontend to communicate with backend
- `express.json()` - Parse JSON request bodies
- Custom error handling middleware

---

### **2. config/db.js** - MongoDB Connection

**Purpose**: Connect to MongoDB database

**Connection Process**:
```javascript
1. Use mongoose.connect() with MONGODB_URI
2. If successful:
   - Log connection message
   - Continue server startup
3. If failed:
   - Log error
   - Exit process
```

**Connection String Format**:
```
mongodb://localhost:27017/healthcard
OR
mongodb+srv://user:password@cluster.mongodb.net/healthcard
```

---

### **3. models/User.js** - MongoDB Schema & Methods

**Purpose**: Define user data structure and methods

**Schema Fields**:
```javascript
{
  fullname: String (required, 2+ chars),
  email: String (required, unique, valid email),
  password: String (required, 6+ chars, hashed),
  role: Enum['patient', 'doctor'] (required),
  license: String (optional, for doctors),
  cardId: String (unique for patients, auto-generated),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Pre-save Hooks**:

#### Password Hashing
```javascript
Pre-save middleware:
  1. Check if password is modified
  2. Generate salt with bcryptjs (rounds: 10)
  3. Hash password
  4. Save hashed password to database
```

#### Card ID Generation (for patients)
```javascript
Pre-save middleware:
  1. Check if role is 'patient' and cardId doesn't exist
  2. Generate HC-XXXX-XXXX format
  3. Assign to user document
```

**Custom Methods**:

#### `comparePassword(enteredPassword)`
```javascript
function comparePassword(enteredPassword) {
  1. Use bcryptjs.compare()
  2. Compare entered password with stored hash
  3. Return boolean result
}
```

**Password Security Flow**:
```
User enters password
        ↓
Hashed with salt(10)
        ↓
Stored in database
        ↓
At login: Compare with hash using bcryptjs
```

---

### **4. controllers/authController.js** - Business Logic

**Purpose**: Handle authentication requests (register, login, get user, logout)

#### `register(req, res)`
```javascript
1. Validate input using express-validator
2. Check if user already exists
3. Create new User document
4. If doctor: add license field
5. Save to database (triggers password hashing)
6. Generate JWT token
7. Return token and user data (no password)
```

**Register Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f...",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "cardId": "HC-1234-5678",
    "license": null
  }
}
```

#### `login(req, res)`
```javascript
1. Validate input
2. Find user by email
3. Check if user exists
4. Check if role matches (patient vs doctor)
5. Compare entered password with stored hash
6. If valid: Generate JWT token
7. Return token and user data
```

**Token Generation**:
```javascript
jwt.sign(
  { id, email, role },           // Payload
  process.env.JWT_SECRET,         // Secret key
  { expiresIn: '7d' }             // Expiration
)
```

#### `getCurrentUser(req, res)`
```javascript
1. Extract user ID from JWT token (req.user.id)
2. Find user in database
3. Return user data (no password)
```

#### `logout(req, res)`
```javascript
1. Return success message
2. Client deletes token from localStorage
```

---

### **5. middleware/auth.js** - JWT Verification

**Purpose**: Protect routes that require authentication

**Verification Process**:
```javascript
1. Extract token from Authorization header
   Authorization: Bearer <token>
2. Split "Bearer <token>" → extract token
3. Verify token using jwt.verify()
4. If valid:
   - Decode payload
   - Attach user data to req.user
   - Call next() to continue
5. If invalid:
   - Return 401 Unauthorized
   - Return error message
```

**Usage in Routes**:
```javascript
router.get('/me', verifyToken, getCurrentUser)
// Only authenticated users can access /api/auth/me
```

---

### **6. routes/auth.js** - API Routes & Validation

**Purpose**: Define authentication endpoints with input validation

**Validation Pipeline**:
```javascript
router.post('/register', [
  body('fullname').trim().notEmpty().isLength({min: 2}),
  body('email').notEmpty().isEmail(),
  body('password').notEmpty().isLength({min: 6}),
  body('role').isIn(['patient', 'doctor']),
  body('license').optional()
], registerController)

// If validation fails: Returns 400 with error details
// If validation passes: Calls controller
```

**Available Routes**:
```
POST   /api/auth/register  → Register new user
POST   /api/auth/login     → Login and get token
GET    /api/auth/me        → Get current user (protected)
POST   /api/auth/logout    → Logout (protected)
GET    /api/health         → Check server status
```

---

## Data Flow

### **Registration Flow**

```
Frontend (register.html)
  ↓
User fills form (name, email, password, role)
  ↓
POST /api/auth/register (JSON body)
  ↓
Backend (authController.register)
  ↓
Validate input
  ↓
Check if user exists
  ↓
Create User document
  ↓
Hash password (bcryptjs)
  ↓
Generate cardId if patient
  ↓
Save to MongoDB
  ↓
Generate JWT token
  ↓
Return token + user data
  ↓
Frontend stores token in localStorage
  ↓
Redirect to index.html
```

---

### **Login Flow**

```
Frontend (index.html login modal)
  ↓
User enters email, password, role
  ↓
Form submission
  ↓
POST /api/auth/login (JSON body)
  ↓
Backend (authController.login)
  ↓
Validate input
  ↓
Find user by email
  ↓
Compare passwords using bcryptjs
  ↓
Verify role matches
  ↓
Generate JWT token
  ↓
Return token + user data
  ↓
Frontend stores token in localStorage
  ↓
Redirect to dashboard based on role
```

---

### **Protected Route Access**

```
Frontend sends API request:
GET /api/auth/me
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
  ↓
Backend middleware (verifyToken)
  ↓
Extract token from header
  ↓
jwt.verify(token, SECRET)
  ↓
If valid:
  Attach user data to req.user
  Call next()
  ↓
Controller processes request
  ↓
Return user data
  ↓
Frontend displays data

If invalid:
  Return 401 Unauthorized
  Frontend clears token and redirects to login
```

---

### **Patient Medical Record Update**

```
Doctor Dashboard
  ↓
Doctor searches for patient by card ID
  ↓
GET request to retrieve patient data
  (In future: POST /api/patients/search)
  ↓
Fills medical notes in form
  ↓
Submits form
  ↓
POST /api/patients/:id/records (in future)
  ↓
Backend validates doctor is authenticated
  ↓
Adds record to patient's history
  ↓
Returns updated timeline
  ↓
Frontend re-renders medical history
```

---

## File Structure

```
healthcard/
├── client/
│   └── public/
│       ├── index.html                    # Home + Login
│       ├── register.html                 # Registration
│       ├── assets/
│       │   ├── css/
│       │   │   └── tailwind.css
│       │   └── js/
│       │       ├── auth.js               # Client auth
│       │       ├── api.js                # Data management
│       │       ├── patient.js            # Patient logic
│       │       └── doctor.js             # Doctor logic
│       ├── components/
│       │   ├── navbar.html
│       │   └── footer.html
│       └── dashboards/
│           ├── patient.html              # Patient dashboard
│           └── doctor.html               # Doctor dashboard
│
└── server/
    ├── server.js                         # Express app
    ├── package.json
    ├── .env
    ├── .gitignore
    ├── README.md
    ├── config/
    │   └── db.js                         # MongoDB connection
    ├── models/
    │   └── User.js                       # User schema
    ├── controllers/
    │   └── authController.js             # Auth logic
    ├── middleware/
    │   └── auth.js                       # JWT verification
    └── routes/
        └── auth.js                       # Auth endpoints
```

---

## Environment Variables

**Development (.env)**:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/healthcard
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

**Production (change these)**:
```
PORT=443 (or 80)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/healthcard
JWT_SECRET=<very_long_random_string>
JWT_EXPIRE=7d
NODE_ENV=production
```

---

## Security Considerations

### ✅ Implemented:
- Password hashing with bcryptjs (salt: 10 rounds)
- JWT token-based authentication
- Input validation (express-validator)
- CORS protection
- Password not returned in responses
- Role-based access control

### ⚠️ To Implement Before Production:
- HTTPS/SSL certificates
- Rate limiting (prevent brute force)
- Email verification
- Refresh token mechanism
- Password reset flow
- CSRF protection
- Input sanitization
- Database backups
- Logging and monitoring
- API documentation (Swagger/OpenAPI)

---

## Testing Credentials

**Patient Account**:
```
Email: patient@example.com
Password: password
Role: patient
```

**Doctor Account**:
```
Email: doctor@example.com
Password: password
Role: doctor
```

---

## Next Steps (For Future Development)

### Phase 2 - Medical Data:
- [ ] Create Patient records endpoint
- [ ] Create Medical history endpoints
- [ ] Enable card ID search
- [ ] Add record creation endpoint
- [ ] Implement patient data update endpoint

### Phase 3 - Advanced Features:
- [ ] Email notifications
- [ ] Appointment scheduling
- [ ] Prescription management
- [ ] Lab test records
- [ ] Mobile app integration

---

## Troubleshooting

**MongoDB Connection Failed**:
- Ensure MongoDB is running locally or accessible
- Check MONGODB_URI in .env
- Verify network connectivity if using MongoDB Atlas

**JWT Token Invalid**:
- Token may be expired (default 7 days)
- Verify JWT_SECRET is same on backend
- Check Authorization header format: `Bearer <token>`

**CORS Errors**:
- Ensure frontend URL is allowed in CORS configuration
- Check if backend server is running on correct port

**Password Comparison Fails**:
- Ensure bcryptjs is installed
- Verify password field includes +password in query

---

This completes the comprehensive explanation of the HealthCard codebase!
