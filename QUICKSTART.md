# HealthCard - Quick Start Guide

## What's Been Created

### ✅ Frontend (Completed)
- **index.html** - Home page with login modal
- **register.html** - User registration
- **dashboards/patient.html** - Patient dashboard
- **dashboards/doctor.html** - Doctor dashboard
- **JavaScript modules**:
  - `auth.js` - Client authentication
  - `api.js` - Data management (localStorage)
  - `patient.js` - Patient logic
  - `doctor.js` - Doctor logic

### ✅ Backend (Separate Track)
- Backend APIs are being built and tested separately.
- Current frontend does not depend on backend endpoints.

---

## Project Structure

```
healthcard/
├── client/                          # Frontend (HTML + JS)
│   └── public/
│       ├── index.html
│       ├── register.html
│       ├── assets/js/
│       │   ├── auth.js
│       │   ├── api.js
│       │   ├── patient.js
│       │   └── doctor.js
│       └── dashboards/
│           ├── patient.html
│           └── doctor.html
│
└── server/                          # Backend (Node + Express)
    ├── server.js
    ├── package.json
    ├── .env
    ├── config/db.js                 # MongoDB connection
  ├── models/
  │   ├── User.js
  │   ├── Doctor.js
  │   ├── Patient.js
  │   └── MedicalRecord.js
  ├── middleware/authMiddleware.js
  └── routes/
    ├── authRoutes.js
    ├── doctorRoutes.js
    └── patientRoutes.js
```

---

## How to Run

### Prerequisites
1. **Python 3** or VS Code Live Server

### Frontend Setup

Open the frontend in your browser:

```bash
# Simple way: Open in VS Code Live Server
# Right-click on index.html → "Open with Live Server"

# Or use Python's built-in server
cd client/public
python -m http.server 8000
# Open http://localhost:8000 in browser

# Or use Node's http-server
npx http-server client/public
```

---

## Testing the Application

### 1. **Test Registration**
- Go to `/register.html`
- Fill in details:
  - Name: John Doe
  - Email: john@example.com
  - Password: password123
  - Role: Patient
- Click Register
- Should succeed and redirect to login

### 2. **Test Login**
- Go to `/index.html`
- Click "Login" button
- Enter credentials:
  - Email: john@example.com
  - Password: password123
- Click Login
- Should redirect automatically based on account role

### 3. **Patient Dashboard**
- See your health card with QR code
- View your medical history (initially empty)
- Click logout to return to home

### 4. **Doctor Registration & Login**
- Register as a doctor (no license field required)
- Login with doctor credentials
- Try to search for patient using card ID (HC-XXXX-XXXX format)

### 5. **Doctor Dashboard (Updated Flow)**
- Search patient by `cardId` or `qrCodeId`
- If patient profile is missing `dob`, `bloodGroup`, or `allergies`, a popup appears
- Doctor must complete profile fields before saving a visit record
- Add visit record using:
  - `diagnosis` (required)
  - `notes` (optional)
  - `treatment` (optional)
- New records are appended to the top of patient history timeline

---

## API Endpoints Reference

Default mode is frontend-only (`__HC_USE_BACKEND_AUTH__ = false`).

### Enable Backend Auth (Doctor + Patient)

If your backend auth endpoints are ready, enable frontend integration by adding these lines in [client/public/index.html](client/public/index.html) and [client/public/register.html](client/public/register.html) before loading `auth.js`:

```html
<script>
  window.__HC_USE_BACKEND_AUTH__ = true;
  window.__HC_API_BASE_URL__ = 'http://localhost:5000';
</script>
```

Frontend then calls:
- `POST /api/auth/register`
- `POST /api/auth/login`

Expected registration payload example (doctor):

```json
{
  "email": "doctor1@mail.com",
  "password": "123456",
  "role": "doctor",
  "fullName": "Dr John"
}
```

Expected response fields used by frontend:
- `token`
- `role` (or `user.role` if your backend returns user object)

Direct API test (backend):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor1@mail.com",
    "password": "123456",
    "role": "doctor",
    "fullName": "Dr John"
  }'
```

After successful login/register, frontend stores:
- `authToken` (if returned)
- `currentUser`

### Backend Run (separate)

```bash
cd server
npm install
npm run dev
```

---

## Data Storage

Currently using two storage methods:

### Frontend (localStorage - JSON)
```
localStorage['users']       → User credentials and profiles
localStorage['patientsDB']  → Patient health data
localStorage['currentUser'] → Current session
```

Updated patient object in `patientsDB`:
```
{
  _id: string,              // card id
  cardId: string,
  qrCodeId: string,         // unique, used by QR
  name: string,
  dob: string,              // optional
  phone: string,            // optional
  bloodGroup: string,       // optional
  allergies: string[],      // optional, persistent
  history: MedicalRecord[]
}

MedicalRecord = {
  diagnosis: string,        // required
  notes: string,            // optional
  treatment: string,        // optional
  doctor: string,
  clinic: string,
  date: string,
  time: string
}
```

### Backend
Backend is intentionally decoupled for separate API development/testing.

---

## Current Limitations

### ✅ What Works:
- User registration (patient/doctor)
- Login with localStorage session
- Session management
- Role-based dashboards
- Patient health card display
- QR code generation
- Medical history timeline (frontend only)
- Doctor updates to patient profile and records (frontend only)

### ⏳ Coming Next (Backend Integration):
- Connect frontend flows to your separate backend APIs
- Replace frontend-generated card ID with backend-generated card ID

---

## Environment Variables

Not required for frontend-only mode.

---

## Common Issues & Solutions

### Issue: "Login failed"
**Solution:**
- Register user first from `/register.html`
- Ensure email/password are correct

---

## Key Technology Stack

### Frontend
- **HTML5** - Semantic structure
- **CSS3** (Tailwind) - Responsive styling
- **Vanilla JavaScript** - No frameworks yet
- **QRCode.js** - QR code generation

### Backend (separate workstream)
- APIs and DB integration are developed and tested independently.

---

## Documentation Files

1. **CODEBASE_EXPLANATION.md** - Complete codebase documentation
2. This file - Quick start guide

---

## Next Phase: Backend Integration

When backend APIs are ready, wire frontend to:
1. Search patient by card ID
2. Create/update patient profile
3. Add medical records
4. Fetch medical history
5. Replace localStorage with backend persistence

---

## Support & Debugging

**Reset frontend state (optional):**
1. Open browser DevTools
2. Clear `localStorage`
3. Register users again

---

**You're all set! 🎉**
- Frontend is fully working without backend
- Backend can now be tested separately

For detailed explanations, see **CODEBASE_EXPLANATION.md**
