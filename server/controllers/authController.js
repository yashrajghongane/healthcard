const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user (patient or doctor)
// @access  Public
exports.register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { fullname, email, password, role, license } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    user = new User({
      fullname,
      email,
      password,
      role
    });

    // Add license for doctors
    if (role === 'doctor') {
      if (!license) {
        return res.status(400).json({
          success: false,
          message: 'Medical license number is required for doctors'
        });
      }
      user.license = license;
    }

    // Save user to database (password will be hashed by pre-save hook)
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Return response without password
    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      cardId: user.cardId || null,
      license: user.license || null,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
};

// @route   POST /api/auth/login
// @desc    Login user and return JWT token
// @access  Public
exports.login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if role matches
    if (user.role !== role) {
      return res.status(401).json({
        success: false,
        message: `This email is registered as a ${user.role}, not a ${role}`
      });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Return response without password
    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      cardId: user.cardId || null,
      license: user.license || null,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged-in user info
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        cardId: user.cardId || null,
        license: user.license || null,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
};

// @route   POST /api/auth/logout
// @desc    Logout user (token-based, just return confirmation)
// @access  Private
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please delete the token on client side.'
  });
};
