# HealthCard (Local Setup)

This project is configured for local use.

## Run locally

1. Install backend dependencies:

   ```bash
   cd server
   npm install
   ```

2. Start server:

   ```bash
   npm run dev
   ```

3. Open app in browser:

   - http://localhost:5000/

## Notes

- Frontend API calls are set to local backend: `http://localhost:5000`.
- Ensure `server/.env` has valid values for `MONGO_URI`, `JWT_SECRET`, and webhook settings.