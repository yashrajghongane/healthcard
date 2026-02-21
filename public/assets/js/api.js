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

function normalizeClientText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeClientEmail(value) {
  return normalizeClientText(value, 120).toLowerCase();
}

function isValidClientEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeClientEmail(value));
}

function normalizeClientHealthCardId(value) {
  return normalizeClientText(value, 20).toUpperCase();
}

function isValidClientHealthCardId(value) {
  return /^HC-\d{4}-\d{4}$/.test(normalizeClientHealthCardId(value));
}

function normalizeClientPhone(value) {
  return normalizeClientText(value, 20).replace(/[\s()-]/g, '');
}

function isValidClientPhone(value) {
  const normalized = normalizeClientPhone(value);
  if (!normalized) return true;
  return /^\+?[1-9]\d{9,14}$/.test(normalized);
}

function normalizeClientBloodGroup(value) {
  return normalizeClientText(value, 5).toUpperCase();
}

function isValidClientBloodGroup(value) {
  const normalized = normalizeClientBloodGroup(value);
  if (!normalized) return true;
  return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(normalized);
}

function isValidClientDob(value) {
  if (!value) return true;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;

  const now = new Date();
  const oldest = new Date();
  oldest.setFullYear(now.getFullYear() - 130);

  return dob <= now && dob >= oldest;
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

function formatDateOnly(dateLike) {
  const date = new Date(dateLike || Date.now());
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const cardId = patient.healthCardId || patient.cardId || patient.qrCodeId;
  const qrCodeId = patient.qrCodeId || cardId;

  return {
    _id: cardId,
    cardId,
    qrCodeId,
    name: patient.fullName || patient.name || '',
    phone: patient.phoneNumber || patient.phone || '',
    relativePhone: patient.relativePhoneNumber || patient.relativePhone || '',
    address: patient.address || '',
    dob: patient.dob ? formatDateOnly(patient.dob) : '',
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
  const normalizedEmail = normalizeClientEmail(userData.email);
  const normalizedFullName = normalizeClientText(userData.fullname, 80);
  const normalizedPassword = normalizeClientText(userData.password, 72);

  if (!normalizedFullName || !/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(normalizedFullName)) {
    return { success: false, message: 'Enter a valid full name' };
  }

  if (!isValidClientEmail(normalizedEmail)) {
    return { success: false, message: 'Enter a valid email address' };
  }

  if (normalizedPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  if (!['patient', 'doctor'].includes(String(userData.role || ''))) {
    return { success: false, message: 'Invalid role selected' };
  }

  userData.email = normalizedEmail;
  userData.fullname = normalizedFullName;
  userData.password = normalizedPassword;
  
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
    userData.relativePhone = '';
    userData.address = '';
    userData.allergies = [];

    // Add to patients database
    const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
    patientsDB[userData.cardId] = {
      _id: userData.cardId,
      cardId: userData.cardId,
      qrCodeId: userData.qrCodeId,
      name: userData.fullname,
      phone: userData.phone || '',
      relativePhone: userData.relativePhone || '',
      address: userData.address || '',
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
  const normalizedCardId = normalizeClientHealthCardId(cardId);
  if (!isValidClientHealthCardId(normalizedCardId)) {
    return null;
  }

  const { useBackend } = getRuntimeConfig();
  if (useBackend) {
    try {
      const { response, data } = await apiRequest(`/api/doctor/patient/${encodeURIComponent(normalizedCardId)}`);
      if (!response.ok || !data || !data.patient) {
        return null;
      }

      return mapBackendPatient(data.patient, data.history || []);
    } catch {
      return null;
    }
  }

  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  if (patientsDB[normalizedCardId]) {
    return patientsDB[normalizedCardId];
  }

  const allPatients = Object.values(patientsDB);
  return allPatients.find((patient) => patient.qrCodeId === normalizedCardId) || null;
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
  const normalizedCardId = normalizeClientHealthCardId(cardId);
  if (!isValidClientHealthCardId(normalizedCardId)) {
    return { success: false, message: 'Card ID must be in HC-1234-5678 format' };
  }

  const { useBackend } = getRuntimeConfig();
  const payload = { ...data };

  if (Object.prototype.hasOwnProperty.call(payload, 'dob') && !isValidClientDob(payload.dob)) {
    return { success: false, message: 'Date of birth must be a valid past date' };
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'bloodGroup')) {
    if (!isValidClientBloodGroup(payload.bloodGroup)) {
      return { success: false, message: 'Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-' };
    }
    payload.bloodGroup = normalizeClientBloodGroup(payload.bloodGroup);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    if (!isValidClientPhone(payload.phone)) {
      return { success: false, message: 'Phone number format is invalid' };
    }
    payload.phone = normalizeClientPhone(payload.phone);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phoneNumber')) {
    if (!isValidClientPhone(payload.phoneNumber)) {
      return { success: false, message: 'Phone number format is invalid' };
    }
    payload.phoneNumber = normalizeClientPhone(payload.phoneNumber);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'relativePhone')) {
    if (!isValidClientPhone(payload.relativePhone)) {
      return { success: false, message: 'Relative phone number format is invalid' };
    }
    payload.relativePhone = normalizeClientPhone(payload.relativePhone);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'relativePhoneNumber')) {
    if (!isValidClientPhone(payload.relativePhoneNumber)) {
      return { success: false, message: 'Relative phone number format is invalid' };
    }
    payload.relativePhoneNumber = normalizeClientPhone(payload.relativePhoneNumber);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'address')) {
    payload.address = normalizeClientText(payload.address, 250);
  }

  if (useBackend) {
    try {
      const backendPayload = {
        ...payload,
        allergies: Object.prototype.hasOwnProperty.call(data || {}, 'allergies')
          ? normalizeAllergies(data.allergies)
          : undefined
      };

      const { response, data: responseData } = await apiRequest(`/api/doctor/patient/${encodeURIComponent(normalizedCardId)}`, {
        method: 'PATCH',
        body: backendPayload
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
  
  if (!patientsDB[normalizedCardId]) {
    return { success: false, message: 'Patient not found' };
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'allergies')) {
    payload.allergies = normalizeAllergies(payload.allergies);
  }

  patientsDB[normalizedCardId] = { ...patientsDB[normalizedCardId], ...payload };
  localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

  // Also update in users if this patient is registered
  const users = JSON.parse(localStorage.getItem('users')) || {};
  for (let email in users) {
    if (users[email].cardId === normalizedCardId) {
      users[email] = { ...users[email], ...payload };
      localStorage.setItem('users', JSON.stringify(users));
      
      // Update current user session if it's them
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.cardId === normalizedCardId) {
        localStorage.setItem('currentUser', JSON.stringify(users[email]));
      }
      break;
    }
  }

  return { success: true, patient: patientsDB[normalizedCardId] };
}

async function getMyDoctorProfile() {
  const { useBackend } = getRuntimeConfig();
  if (!useBackend) {
    const currentUser = getCurrentUser() || {};
    return {
      fullName: currentUser.fullname || '',
      specialization: currentUser.specialization || '',
      hospitalName: currentUser.hospitalName || ''
    };
  }

  try {
    const { response, data } = await apiRequest('/api/doctor/me');
    if (!response.ok || !data) {
      return null;
    }

    return {
      fullName: normalizeClientText(data.fullName || '', 80),
      specialization: normalizeClientText(data.specialization || '', 120),
      hospitalName: normalizeClientText(data.hospitalName || '', 160)
    };
  } catch {
    return null;
  }
}

async function updateMyDoctorProfile(profileData) {
  const payload = {
    fullName: normalizeClientText(profileData.fullName || '', 80),
    specialization: normalizeClientText(profileData.specialization || '', 120),
    hospitalName: normalizeClientText(profileData.hospitalName || '', 160)
  };

  if (!payload.fullName || !/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(payload.fullName)) {
    return { success: false, message: 'Enter a valid full name' };
  }

  const { useBackend } = getRuntimeConfig();
  if (!useBackend) {
    const currentUser = getCurrentUser() || {};
    const updatedUser = {
      ...currentUser,
      fullname: payload.fullName,
      specialization: payload.specialization,
      hospitalName: payload.hospitalName
    };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    return {
      success: true,
      profile: {
        fullName: payload.fullName,
        specialization: payload.specialization,
        hospitalName: payload.hospitalName
      }
    };
  }

  try {
    const { response, data } = await apiRequest('/api/doctor/me', {
      method: 'PATCH',
      body: payload
    });

    if (!response.ok || !data || !data.profile) {
      return {
        success: false,
        message: (data && data.message) || 'Failed to update doctor profile'
      };
    }

    const currentUser = getCurrentUser() || {};
    const updatedUser = {
      ...currentUser,
      fullname: data.profile.fullName || currentUser.fullname || 'Doctor',
      specialization: data.profile.specialization || '',
      hospitalName: data.profile.hospitalName || ''
    };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    return { success: true, profile: data.profile };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to update doctor profile'
    };
  }
}

async function updateMyPatientProfile(profileData) {
  const payload = {
    address: normalizeClientText(profileData.address || '', 250),
    phone: normalizeClientText(profileData.phone || '', 20),
    relativePhone: normalizeClientText(profileData.relativePhone || '', 20)
  };

  if (payload.phone && !isValidClientPhone(payload.phone)) {
    return { success: false, message: 'Phone number format is invalid' };
  }

  if (payload.relativePhone && !isValidClientPhone(payload.relativePhone)) {
    return { success: false, message: 'Relative phone number format is invalid' };
  }

  payload.phone = payload.phone ? normalizeClientPhone(payload.phone) : '';
  payload.relativePhone = payload.relativePhone ? normalizeClientPhone(payload.relativePhone) : '';

  const { useBackend } = getRuntimeConfig();
  if (!useBackend) {
    const currentUser = getCurrentUser() || {};
    const cardId = currentUser.cardId;
    if (!cardId) {
      return { success: false, message: 'Patient profile not found' };
    }

    return updatePatientData(cardId, payload);
  }

  try {
    const { response, data } = await apiRequest('/api/patient/me', {
      method: 'PATCH',
      body: payload
    });

    if (!response.ok || !data || !data.patient) {
      return {
        success: false,
        message: (data && data.message) || 'Failed to update patient profile'
      };
    }

    return {
      success: true,
      patient: mapBackendPatient(data.patient, [])
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to update patient profile'
    };
  }
}

// Add medical record to patient history
async function addMedicalRecord(cardId, record) {
  const normalizedCardId = normalizeClientHealthCardId(cardId);
  if (!isValidClientHealthCardId(normalizedCardId)) {
    return { success: false, message: 'Card ID must be in HC-1234-5678 format' };
  }

  const { useBackend } = getRuntimeConfig();
  const normalizedDiagnosis = normalizeClientText(record.diagnosis, 500);
  const normalizedNotes = normalizeClientText(record.notes, 2000);
  const normalizedTreatment = normalizeClientText(record.treatment || record.treatement, 400);

  if (!normalizedDiagnosis || normalizedDiagnosis.length < 2) {
    return { success: false, message: 'Diagnosis must be at least 2 characters' };
  }

  if (useBackend) {
    try {
      const treatments = normalizeAllergies(normalizedTreatment || record.treatments || '');
      const { response, data } = await apiRequest('/api/doctor/visit', {
        method: 'POST',
        body: {
          healthCardId: normalizedCardId,
          diagnosis: normalizedDiagnosis,
          notes: normalizedNotes,
          treatments
        }
      });

      if (!response.ok) {
        return {
          success: false,
          message: (data && data.message) || 'Failed to add medical record'
        };
      }

      const refreshedPatient = await getPatientByCardId(normalizedCardId);
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
  
  if (!patientsDB[normalizedCardId]) {
    return { success: false, message: 'Patient not found' };
  }

  if (!patientsDB[normalizedCardId].history) {
    patientsDB[normalizedCardId].history = [];
  }

  const normalizedRecord = {
    diagnosis: normalizedDiagnosis,
    notes: normalizedNotes,
    treatment: normalizedTreatment,
    doctor: String(record.doctor || '').trim(),
    clinic: String(record.clinic || '').trim()
  };

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
  patientsDB[normalizedCardId].history.unshift(normalizedRecord);
  localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

  // Also update in users database
  const users = JSON.parse(localStorage.getItem('users')) || {};
  for (let email in users) {
    if (users[email].cardId === normalizedCardId) {
      if (!users[email].history) {
        users[email].history = [];
      }
      users[email].history.unshift(normalizedRecord);
      localStorage.setItem('users', JSON.stringify(users));
      
      // Update current user session if it's them
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.cardId === normalizedCardId) {
        localStorage.setItem('currentUser', JSON.stringify(users[email]));
      }
      break;
    }
  }

  return { success: true, history: patientsDB[normalizedCardId].history };
}

async function requestMedicalRecordOtp(cardId) {
  const normalizedCardId = normalizeClientHealthCardId(cardId);
  if (!isValidClientHealthCardId(normalizedCardId)) {
    return { success: false, message: 'Card ID must be in HC-1234-5678 format' };
  }

  const { useBackend } = getRuntimeConfig();
  if (!useBackend) {
    return { success: true, message: 'OTP skipped in local mode' };
  }

  try {
    const { response, data } = await apiRequest('/api/doctor/visit/request-otp', {
      method: 'POST',
      body: {
        healthCardId: normalizedCardId
      }
    });

    if (!response.ok || !data || data.success === false) {
      return {
        success: false,
        message: (data && data.message) || 'Failed to send OTP'
      };
    }

    return { success: true, message: data.message || 'OTP sent' };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to send OTP'
    };
  }
}

async function verifyMedicalRecordOtp(cardId, otp) {
  const normalizedCardId = normalizeClientHealthCardId(cardId);
  const normalizedOtp = normalizeClientText(otp, 6);

  if (!isValidClientHealthCardId(normalizedCardId)) {
    return { success: false, message: 'Card ID must be in HC-1234-5678 format' };
  }

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return { success: false, message: 'OTP must be a 6-digit code' };
  }

  const { useBackend } = getRuntimeConfig();
  if (!useBackend) {
    return { success: true, message: 'OTP skipped in local mode' };
  }

  try {
    const { response, data } = await apiRequest('/api/doctor/visit/verify-otp', {
      method: 'POST',
      body: {
        healthCardId: normalizedCardId,
        otp: normalizedOtp
      }
    });

    if (!response.ok || !data || data.success === false) {
      return {
        success: false,
        message: (data && data.message) || 'Invalid OTP'
      };
    }

    return { success: true, message: data.message || 'OTP verified' };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to verify OTP'
    };
  }
}

// Get all patients (for doctor view)
async function getAllPatients() {
  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  return Object.values(patientsDB);
}
