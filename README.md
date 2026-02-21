# HealthCard

HealthCard is a full-stack health identity and medical record system for patients and doctors.
It provides role-based authentication, patient profile management, doctor visit records, emergency QR access, and OTP verification for sensitive doctor updates.

## Project Overview

- **Frontend:** Static HTML + TailwindCSS + Vanilla JavaScript (served by Express)
- **Backend:** Node.js + Express (ESM modules)
- **Database:** MongoDB Atlas via Mongoose
- **Auth:** JWT + role-based route protection (`patient`, `doctor`)
- **Security:** Helmet, input validation/sanitization, password hashing, OTP verification for doctor record updates

## Key Features

- Patient and doctor registration/login
- Forgot password flow with verification code
- Patient self-profile updates (address, phone, blood group, DOB, allergies)
- Doctor profile updates (name, specialization, hospital)
- Doctor search by HealthCard ID and add visit records
- OTP-gated doctor update workflow (`request-otp` -> `verify-otp` -> `visit`)
- Emergency QR mode for quick critical profile lookup
- Role dashboards with profile/password popup UI

## Current Folder Structure

- `public/` - frontend pages and JS/CSS assets
- `server/` - backend app, models, middleware, and API routes
- `package.json` - root helper scripts

Important route files:

- `server/routes/authRoutes.js`
- `server/routes/doctorRoutes.js`
- `server/routes/patientRoutes.js`
- `server/routes/emergencyRoutes.js`

## Environment Variables (`server/.env`)

Required:

- `PORT=5000`
- `MONGO_URI=<your-mongodb-connection-string>`
- `JWT_SECRET=<your-secret>`

Optional (for email/webhook flows):

- `MAKE_WEBHOOK_URL=<make-webhook-url>`
- `MAKE_WEBHOOK_API_KEY=<make-api-key>`

## Run the Project (Local)

1. Install server dependencies

```bash
cd server
npm install
```

2. Start backend (also serves frontend)

```bash
npm run dev
```

3. Open app

- Local desktop: `http://localhost:5000/`
- Workspace/Codespaces: open forwarded port `5000` URL from the **Ports** panel.

## API Health Check

`GET /api/health`

Example response:

```json
{
   "message": "HealthCard API Running",
   "database": "connected",
   "mongoUriConfigured": true,
   "mongoLastError": null
}
```

## Core API Endpoints

### Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `POST /forgot-password`
- `POST /forgot-password/verify`
- `POST /forgot-password/reset`
- `POST /change-password` (protected)

### Doctor (`/api/doctor`)

- `GET /me` (doctor profile)
- `PATCH /me`
- `POST /visit/request-otp`
- `POST /visit/verify-otp`
- `POST /visit` (create medical record)
- `PATCH /patient/:healthCardId`
- `GET /patient/:healthCardId`

### Patient (`/api/patient`)

- `GET /me`
- `PATCH /me`

### Emergency (`/api`)

- `GET /emergency/scan/:qrCodeId`

## Troubleshooting

- If UI loads but API calls fail:
   - confirm backend is running on port `5000`
   - check browser console/network for failed `/api/*` request URLs
- If DB is disconnected:
   - verify `MONGO_URI` in `server/.env`
   - verify Atlas network access and DB user credentials
- If workspace URL is used:
   - use the forwarded `5000` port URL (not raw localhost)

## Notes

- This repository is currently configured for local/workspace development.
- Keep secrets out of commits and rotate credentials if they are exposed.