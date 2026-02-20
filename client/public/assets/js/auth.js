// Login/Logout & Session logic

// Initialize localStorage with default users if empty
function initializeDefaultUsers() {
  if (!localStorage.getItem('users')) {
    const defaultUsers = {
      // Default patient
      'patient1@example.com': {
        email: 'patient1@example.com',
        password: 'patient123',
        role: 'patient',
        fullname: 'Aarav Sharma',
        cardId: 'HC-8472-9910',
        dob: '14 May 1992',
        bloodGroup: 'O+',
        allergies: 'Penicillin, Peanuts',
        history: [
          {
            date: '12 Feb 2026',
            time: '10:30 AM',
            doctor: 'Dr. Mehta',
            clinic: 'City Care Clinic',
            notes: 'Patient reported mild headaches and fatigue. Blood pressure normal (120/80). Prescribed rest and standard multivitamin course.'
          },
          {
            date: '05 Nov 2025',
            time: '02:15 PM',
            doctor: 'Dr. Sarah Jenkins',
            clinic: 'Metro Hospital',
            notes: 'Annual physical checkup. All vitals within normal ranges. Updated tetanus booster shot.'
          }
        ]
      },
      // Default doctor
      'doctor1@example.com': {
        email: 'doctor1@example.com',
        password: 'doctor123',
        role: 'doctor',
        fullname: 'Dr. Mehta',
        license: 'MED-123456'
      }
    };
    localStorage.setItem('users', JSON.stringify(defaultUsers));
  }

  // Initialize patients database for doctors to search
  if (!localStorage.getItem('patientsDB')) {
    const patientsDB = {
      'HC-8472-9910': {
        cardId: 'HC-8472-9910',
        name: 'Aarav Sharma',
        dob: '14 May 1992',
        bloodGroup: 'O+',
        allergies: 'Penicillin, Peanuts',
        history: [
          {
            date: '12 Feb 2026',
            time: '10:30 AM',
            doctor: 'Dr. Mehta',
            clinic: 'City Care Clinic',
            notes: 'Patient reported mild headaches and fatigue. Blood pressure normal (120/80). Prescribed rest and standard multivitamin course.'
          },
          {
            date: '05 Nov 2025',
            time: '02:15 PM',
            doctor: 'Dr. Sarah Jenkins',
            clinic: 'Metro Hospital',
            notes: 'Annual physical checkup. All vitals within normal ranges. Updated tetanus booster shot.'
          }
        ]
      }
    };
    localStorage.setItem('patientsDB', JSON.stringify(patientsDB));
  }
}

// Call on page load
initializeDefaultUsers();

// Login function
function login(email, password, role) {
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const user = users[email];

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Incorrect password' };
  }

  if (user.role !== role) {
    return { success: false, message: 'Invalid role selected' };
  }

  // Store session
  localStorage.setItem('currentUser', JSON.stringify(user));
  return { success: true, user: user };
}

// Logout function
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = '../index.html';
}

// Get current logged-in user
function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Check if user is logged in
function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Protect dashboard pages (call this on dashboard pages)
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '../index.html';
  }
}
