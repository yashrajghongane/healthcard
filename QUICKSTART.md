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

### ✅ Backend (Just Created - Auth Only)
- **Express.js server** with MongoDB
- **Authentication endpoints**:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login with JWT
  - `GET /api/auth/me` - Get current user (protected)
  - `POST /api/auth/logout` - Logout
- **User Model** with password hashing (bcryptjs)
- **JWT token verification** middleware
- **Input validation** with express-validator
- **CORS enabled** for frontend communication

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
    ├── models/User.js               # User schema
    ├── controllers/authController.js # Auth logic
    ├── middleware/auth.js            # JWT middleware
    ├── routes/auth.js                # API routes
    └── README.md                     # Server documentation
```

---

## How to Run

### Prerequisites
1. **MongoDB** installed and running locally
   ```bash
   # macOS (if using Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

2. **Node.js** and **npm** installed

### Backend Setup

```bash
# 1. Navigate to server directory
cd server

# 2. Install dependencies
npm install

# 3. The .env file is already created with:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/healthcard
# JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
# JWT_EXPIRE=7d

# 4. Start the server (development with auto-reload)
npm run dev

# OR production mode
npm start
```

Expected output:
```
✅ Server running on http://localhost:5000
📝 Mode: development
✅ MongoDB Connected: localhost
```

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
  - Role: Patient
- Click Login
- Should redirect to `/dashboards/patient.html`

### 3. **Patient Dashboard**
- See your health card with QR code
- View your medical history (initially empty)
- Click logout to return to home

### 4. **Doctor Registration & Login**
- Register as a doctor with:
  - Medical License: MED-123456
- Login with doctor credentials
- Try to search for patient using card ID (HC-XXXX-XXXX format)

---

## API Endpoints Reference

### Authentication Endpoints

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "patient"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "patient"
  }'
```

**Get Current User (Protected):**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
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

### Backend (MongoDB - with JWT)
```
Database: healthcard
Collection: users
Fields: fullname, email, password(hashed), role, license, cardId
```

---

## Current Limitations

### ✅ What Works:
- User registration (patient/doctor)
- Login with JWT authentication
- Session management
- Role-based dashboards
- Patient health card display
- QR code generation
- Medical history timeline (frontend only)

### ⏳ Coming Next (Medical Data):
- Backend endpoints for medical records
- Patient search functionality
- Add medical records endpoint
- Doctor-patient data persistence
- Real database operations for medical data

---

## Environment Variables Explanation

**`.env` file contains:**

```
PORT=5000
  → Server runs on http://localhost:5000

MONGODB_URI=mongodb://localhost:27017/healthcard
  → Connects to local MongoDB
  → For MongoDB Atlas: mongodb+srv://user:password@cluster.mongodb.net/healthcard

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
  → Secret key for signing JWT tokens
  → MUST be changed in production!
  → Use a strong random string

JWT_EXPIRE=7d
  → Token expires after 7 days
  → Valid formats: '2h', '7d', '30d'

NODE_ENV=development
  → Shows detailed errors in development
  → Set to 'production' for deployment
```

---

## Common Issues & Solutions

### Issue: "MongoDB connection failed"
**Solution:**
- Ensure MongoDB is running: `mongo` or `mongosh`
- Check if using MongoDB Atlas, update MONGODB_URI
- If using localhost, create database first in MongoDB

### Issue: "Cannot find module 'express'"
**Solution:**
```bash
cd server
npm install
```

### Issue: "CORS error when connecting from frontend"
**Solution:**
- Backend server must be running on port 5000
- Frontend must call `http://localhost:5000/api/auth/...`
- Already configured in server.js

### Issue: "Token expired or invalid"
**Solution:**
- Log in again to get a new token
- Token stored in localStorage is valid for 7 days
- Check Authorization header: `Bearer <token>`

---

## Key Technology Stack

### Frontend
- **HTML5** - Semantic structure
- **CSS3** (Tailwind) - Responsive styling
- **Vanilla JavaScript** - No frameworks yet
- **QRCode.js** - QR code generation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **bcryptjs** - Password hashing
- **jsonwebtoken (JWT)** - Token authentication
- **express-validator** - Input validation
- **CORS** - Cross-origin requests
- **dotenv** - Environment variables

---

## Documentation Files

1. **CODEBASE_EXPLANATION.md** - Complete codebase documentation
2. **server/README.md** - Backend API documentation
3. This file - Quick start guide

---

## Next Phase: Adding Medical Data

After confirming authentication works, we'll add:
1. `POST /api/patients/search` - Search by card ID
2. `GET /api/patients/:id` - Get patient data
3. `POST /api/patients/:id/records` - Add medical record
4. `GET /api/patients/:id/records` - Get medical history
5. Update frontend to use API instead of localStorage

---

## Support & Debugging

**Check if backend is running:**
```bash
curl http://localhost:5000/api/health
# Response: {"status": "Server is running", "timestamp": "..."}
```

**Check MongoDB connection:**
```bash
mongosh
# Then type: use healthcard
#            db.users.find()
```

**View server logs** (if using npm run dev with nodemon):
```
All requests and errors are logged to console
```

---

**You're all set! 🎉**
- Frontend is ready with UI
- Backend is ready with authentication
- Next: Medical data endpoints

For detailed explanations, see **CODEBASE_EXPLANATION.md**
