const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Register Route
// POST /api/auth/register
router.post('/register', [
  body('fullname')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be either patient or doctor'),
  
  body('license')
    .optional()
    .trim()
], authController.register);

// Login Route
// POST /api/auth/login
router.post('/login', [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be either patient or doctor')
], authController.login);

// Get Current User
// GET /api/auth/me
router.get('/me', verifyToken, authController.getCurrentUser);

// Logout Route
// POST /api/auth/logout
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
