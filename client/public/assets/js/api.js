// Shared data management functions

function normalizeAllergies(allergiesValue) {
  if (Array.isArray(allergiesValue)) {
    return allergiesValue
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof allergiesValue === 'string') {
    return allergiesValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

// Register a new user
function registerUser(userData) {
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const normalizedEmail = String(userData.email || '').trim().toLowerCase();
  userData.email = normalizedEmail;
  
  // Check if user already exists
  if (users[normalizedEmail]) {
    return { success: false, message: 'User already exists' };
  }

  // Generate card ID for patients
  if (userData.role === 'patient') {
    userData.cardId = generateCardId();
    userData.qrCodeId = userData.cardId;
    userData.history = [];
    userData.dob = '';
    userData.bloodGroup = '';
    userData.phone = '';
    userData.allergies = [];

    // Add to patients database
    const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
    patientsDB[userData.cardId] = {
      _id: userData.cardId,
      cardId: userData.cardId,
      qrCodeId: userData.qrCodeId,
      name: userData.fullname,
      phone: userData.phone || '',
      dob: userData.dob || '',
      bloodGroup: userData.bloodGroup || '',
      allergies: normalizeAllergies(userData.allergies),
      history: []
    };
    localStorage.setItem('patientsDB', JSON.stringify(patientsDB));
  }

  // Save user
  users[normalizedEmail] = userData;
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
  if (patientsDB[cardId]) {
    return patientsDB[cardId];
  }

  const allPatients = Object.values(patientsDB);
  return allPatients.find((patient) => patient.qrCodeId === cardId) || null;
}

// Update patient data
function updatePatientData(cardId, data) {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  
  if (!patientsDB[cardId]) {
    return { success: false, message: 'Patient not found' };
  }

  const payload = { ...data };

  if (Object.prototype.hasOwnProperty.call(payload, 'allergies')) {
    payload.allergies = normalizeAllergies(payload.allergies);
  }

  patientsDB[cardId] = { ...patientsDB[cardId], ...payload };
  localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

  // Also update in users if this patient is registered
  const users = JSON.parse(localStorage.getItem('users')) || {};
  for (let email in users) {
    if (users[email].cardId === cardId) {
      users[email] = { ...users[email], ...payload };
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

  const normalizedRecord = {
    diagnosis: String(record.diagnosis || '').trim(),
    notes: String(record.notes || '').trim(),
    treatment: String(record.treatment || record.treatement || '').trim(),
    doctor: String(record.doctor || '').trim(),
    clinic: String(record.clinic || '').trim()
  };

  if (!normalizedRecord.diagnosis) {
    return { success: false, message: 'Diagnosis is required' };
  }

  // Add timestamp if not provided
  if (!record.date || !record.time) {
    const now = new Date();
    const optionsDate = { day: '2-digit', month: 'short', year: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: true };
    normalizedRecord.date = now.toLocaleDateString('en-GB', optionsDate);
    normalizedRecord.time = now.toLocaleTimeString('en-US', optionsTime);
  } else {
    normalizedRecord.date = record.date;
    normalizedRecord.time = record.time;
  }

  // Add to beginning of history array
  patientsDB[cardId].history.unshift(normalizedRecord);
  localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

  // Also update in users database
  const users = JSON.parse(localStorage.getItem('users')) || {};
  for (let email in users) {
    if (users[email].cardId === cardId) {
      if (!users[email].history) {
        users[email].history = [];
      }
      users[email].history.unshift(normalizedRecord);
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
