# HealthCard Server

Express.js + MongoDB REST API for HealthCard application. Handles user authentication (login, register) and user management.

## Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm

### Installation

```bash
cd server
npm install
```

### Environment Variables

Create a `.env` file in the server root:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/healthcard
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

### Running the Server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will be available at `http://localhost:5000`

---

## API Endpoints

### 1. **Register User**
**POST** `/api/auth/register`

Create a new user account (patient or doctor).

**Request Body:**
```json
{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient",
  "license": "MED-123456" // Only for doctors
}
```

**Response (201):**
```json
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
    "license": null,
    "createdAt": "2024-02-20T10:00:00Z"
  }
}
```

---

### 2. **Login User**
**POST** `/api/auth/login`

Login user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "role": "patient"
}
```

**Response (200):**
```json
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
    "license": null,
    "createdAt": "2024-02-20T10:00:00Z"
  }
}
```

---

### 3. **Get Current User**
**GET** `/api/auth/me`

Get details of the currently logged-in user.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "cardId": "HC-1234-5678",
    "license": null,
    "createdAt": "2024-02-20T10:00:00Z"
  }
}
```

---

### 4. **Logout**
**POST** `/api/auth/logout`

Logout user (token-based authentication).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful. Please delete the token on client side."
}
```

---

### 5. **Health Check**
**GET** `/api/health`

Check if server is running.

**Response (200):**
```json
{
  "status": "Server is running",
  "timestamp": "2024-02-20T10:00:00Z"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (only in development)"
}
```

### Common Errors:

- **400 Bad Request** - Validation failed
- **401 Unauthorized** - Invalid credentials or expired token
- **409 Conflict** - User already exists
- **500 Internal Server Error** - Server error

---

## Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  fullname: String (required),
  email: String (required, unique),
  password: String (hashed, required),
  role: String (enum: ['patient', 'doctor']),
  license: String (for doctors),
  cardId: String (unique for patients),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Security Features

✅ **Password Hashing** - bcryptjs with salt rounds
✅ **JWT Authentication** - Secure token-based auth
✅ **Input Validation** - express-validator
✅ **CORS Protection** - Cross-origin enabled
✅ **Error Handling** - Comprehensive error responses
✅ **Environment Variables** - Sensitive data protected

---

## Future Enhancements

- [ ] Medical records endpoints
- [ ] Patient search by card ID
- [ ] Doctor dashboard endpoints
- [ ] Refresh token mechanism
- [ ] Rate limiting
- [ ] Email verification
- [ ] Password reset

---

## Development Notes

- MongoDB must be running locally or accessible via MONGODB_URI
- Change JWT_SECRET in production
- Use HTTPS in production
- Implement rate limiting before production deployment
