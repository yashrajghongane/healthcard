// Shared data management functions

// Register a new user
function registerUser(userData) {
  const users = JSON.parse(localStorage.getItem('users')) || {};
  
  // Check if user already exists
  if (users[userData.email]) {
    return { success: false, message: 'User already exists' };
  }

  // Generate card ID for patients
  if (userData.role === 'patient') {
    userData.cardId = generateCardId();
    userData.history = [];
    userData.dob = '';
    userData.bloodGroup = '';
    userData.allergies = 'None';

    // Add to patients database
    const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
    patientsDB[userData.cardId] = {
      cardId: userData.cardId,
      name: userData.fullname,
      dob: userData.dob || 'Not set',
      bloodGroup: userData.bloodGroup || 'Not set',
      allergies: userData.allergies,
      history: []
    };
    localStorage.setItem('patientsDB', JSON.stringify(patientsDB));
  }

  // Save user
  users[userData.email] = userData;
  localStorage.setItem('users', JSON.stringify(users));

  return { success: true, user: userData };
}

// Generate unique card ID
function generateCardId() {
  const random1 = Math.floor(1000 + Math.random() * 9000);
  const random2 = Math.floor(1000 + Math.random() * 9000);
  return `HC-${random1}-${random2}`;
}

// Get patient data by card ID
function getPatientByCardId(cardId) {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  return patientsDB[cardId] || null;
}

// Update patient data
function updatePatientData(cardId, data) {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  
  if (!patientsDB[cardId]) {
    return { success: false, message: 'Patient not found' };
  }

  patientsDB[cardId] = { ...patientsDB[cardId], ...data };
  localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

  // Also update in users if this patient is registered
  const users = JSON.parse(localStorage.getItem('users')) || {};
  for (let email in users) {
    if (users[email].cardId === cardId) {
      users[email] = { ...users[email], ...data };
      localStorage.setItem('users', JSON.stringify(users));
      
      // Update current user session if it's them
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.cardId === cardId) {
        localStorage.setItem('currentUser', JSON.stringify(users[email]));
      }
      break;
    }
  }

  return { success: true, patient: patientsDB[cardId] };
}

// Add medical record to patient history
function addMedicalRecord(cardId, record) {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  
  if (!patientsDB[cardId]) {
    return { success: false, message: 'Patient not found' };
  }

  if (!patientsDB[cardId].history) {
    patientsDB[cardId].history = [];
  }

  // Add timestamp if not provided
  if (!record.date || !record.time) {
    const now = new Date();
    const optionsDate = { day: '2-digit', month: 'short', year: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: true };
    record.date = now.toLocaleDateString('en-GB', optionsDate);
    record.time = now.toLocaleTimeString('en-US', optionsTime);
  }

  // Add to beginning of history array
  patientsDB[cardId].history.unshift(record);
  localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

  // Also update in users database
  const users = JSON.parse(localStorage.getItem('users')) || {};
  for (let email in users) {
    if (users[email].cardId === cardId) {
      if (!users[email].history) {
        users[email].history = [];
      }
      users[email].history.unshift(record);
      localStorage.setItem('users', JSON.stringify(users));
      
      // Update current user session if it's them
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.cardId === cardId) {
        localStorage.setItem('currentUser', JSON.stringify(users[email]));
      }
      break;
    }
  }

  return { success: true, history: patientsDB[cardId].history };
}

// Get all patients (for doctor view)
function getAllPatients() {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  return Object.values(patientsDB);
}
