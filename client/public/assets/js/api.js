// Shared data management functions

function getRuntimeConfig() {
  return {
    useBackend: Boolean(window.__HC_USE_BACKEND_AUTH__),
    apiBaseUrl: resolveApiBaseUrl()
  };
}

function resolveApiBaseUrl() {
  if (window.__HC_API_BASE_URL__) {
    return window.__HC_API_BASE_URL__;
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  const apiPort = window.__HC_API_PORT__ || '5000';

  if (hostname.endsWith('.app.github.dev')) {
    const codespacesHost = hostname.replace(/-\d+\.app\.github\.dev$/, `-${apiPort}.app.github.dev`);
    return `${protocol}//${codespacesHost}`;
  }

  return `${protocol}//${hostname}:${apiPort}`;
}

function getApiUrl(path) {
  const { apiBaseUrl } = getRuntimeConfig();
  const base = String(apiBaseUrl || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function getAuthToken() {
  return localStorage.getItem('authToken') || '';
}

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (options.auth !== false) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(getApiUrl(path), {
    method: options.method || 'GET',
    headers,
    body: typeof options.body === 'undefined' ? undefined : JSON.stringify(options.body)
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data };
}

function formatDateTime(dateLike) {
  const date = new Date(dateLike || Date.now());
  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

  return {
    date: date.toLocaleDateString('en-GB', dateOptions),
    time: date.toLocaleTimeString('en-US', timeOptions)
  };
}

function mapBackendRecord(record) {
  const dateTime = formatDateTime(record.visitDate || record.createdAt || Date.now());

  return {
    diagnosis: record.diagnosis || '',
    notes: record.notes || '',
    treatment: Array.isArray(record.treatments) ? record.treatments.join(', ') : (record.treatment || ''),
    doctor: (record.doctor && record.doctor.fullName) || 'Doctor',
    clinic: 'HealthCard Clinic',
    date: dateTime.date,
    time: dateTime.time
  };
}

function mapBackendPatient(patient, history = []) {
  return {
    _id: patient.healthCardId || patient.cardId,
    cardId: patient.healthCardId || patient.cardId,
    qrCodeId: patient.healthCardId || patient.cardId,
    name: patient.fullName || patient.name || '',
    phone: patient.phoneNumber || patient.phone || '',
    dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
    bloodGroup: patient.bloodGroup || '',
    allergies: normalizeAllergies(patient.allergies),
    history: history.map(mapBackendRecord)
  };
}

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
async function getPatientByCardId(cardId) {
  const { useBackend } = getRuntimeConfig();
  if (useBackend) {
    try {
      const { response, data } = await apiRequest(`/api/doctor/patient/${encodeURIComponent(cardId)}`);
      if (!response.ok || !data || !data.patient) {
        return null;
      }

      return mapBackendPatient(data.patient, data.history || []);
    } catch {
      return null;
    }
  }

  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  if (patientsDB[cardId]) {
    return patientsDB[cardId];
  }

  const allPatients = Object.values(patientsDB);
  return allPatients.find((patient) => patient.qrCodeId === cardId) || null;
}

async function getMyPatientProfile() {
  const { useBackend } = getRuntimeConfig();
  if (!useBackend) {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.cardId) {
      return null;
    }
    return getPatientByCardId(currentUser.cardId);
  }

  try {
    const { response, data } = await apiRequest('/api/patient/me');
    if (!response.ok || !data) {
      return null;
    }

    return mapBackendPatient(data, data.history || []);
  } catch {
    return null;
  }
}

// Update patient data
async function updatePatientData(cardId, data) {
  const { useBackend } = getRuntimeConfig();
  if (useBackend) {
    try {
      const payload = {
        ...data,
        allergies: Object.prototype.hasOwnProperty.call(data || {}, 'allergies')
          ? normalizeAllergies(data.allergies)
          : undefined
      };

      const { response, data: responseData } = await apiRequest(`/api/doctor/patient/${encodeURIComponent(cardId)}`, {
        method: 'PATCH',
        body: payload
      });

      if (!response.ok || !responseData || !responseData.patient) {
        return {
          success: false,
          message: (responseData && responseData.message) || 'Failed to update patient profile'
        };
      }

      return {
        success: true,
        patient: mapBackendPatient(responseData.patient, [])
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update patient profile'
      };
    }
  }

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
async function addMedicalRecord(cardId, record) {
  const { useBackend } = getRuntimeConfig();
  if (useBackend) {
    try {
      const treatments = normalizeAllergies(record.treatment || record.treatement || record.treatments || '');
      const { response, data } = await apiRequest('/api/doctor/visit', {
        method: 'POST',
        body: {
          healthCardId: cardId,
          diagnosis: String(record.diagnosis || '').trim(),
          notes: String(record.notes || '').trim(),
          treatments
        }
      });

      if (!response.ok) {
        return {
          success: false,
          message: (data && data.message) || 'Failed to add medical record'
        };
      }

      const refreshedPatient = await getPatientByCardId(cardId);
      return {
        success: true,
        history: refreshedPatient ? refreshedPatient.history : [mapBackendRecord(data)]
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to add medical record'
      };
    }
  }

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
async function getAllPatients() {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  return Object.values(patientsDB);
}
