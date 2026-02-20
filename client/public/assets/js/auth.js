// Login/Logout & Session logic

const AUTH_CONFIG = {
  useBackend: Boolean(window.__HC_USE_BACKEND_AUTH__),
  apiBaseUrl: window.__HC_API_BASE_URL__ || 'http://localhost:5000'
};

function getApiUrl(path) {
  const base = String(AUTH_CONFIG.apiBaseUrl || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function normalizeBackendUser(user) {
  if (!user) return null;

  return {
    ...user,
    fullname: user.fullname || user.fullName || '',
    role: user.role || 'patient'
  };
}

function buildUserFromBackendResponse(data, fallback = {}) {
  const explicitUser = normalizeBackendUser(data.user || null);
  if (explicitUser) {
    return explicitUser;
  }

  return {
    email: String(fallback.email || '').trim().toLowerCase(),
    role: data.role || fallback.role || 'patient',
    fullname: data.fullname || data.fullName || fallback.fullname || fallback.fullName || (data.role === 'doctor' ? 'Doctor' : 'Patient')
  };
}

function isBackendSuccessResponse(response, data) {
  if (!response.ok) {
    return false;
  }

  if (typeof data.success === 'boolean') {
    return data.success;
  }

  return Boolean(data.token || data.role || data.user);
}

function saveSessionUser(user, token) {
  if (token) {
    localStorage.setItem('authToken', token);
  }

  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}

function removeLegacyMockData() {
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const userKeys = Object.keys(users);

  const hasOnlyLegacyUsers =
    userKeys.length === 2 &&
    users['patient1@example.com'] &&
    users['doctor1@example.com'];

  if (hasOnlyLegacyUsers) {
    localStorage.setItem('users', JSON.stringify({}));
  }

  const patientsDB = JSON.parse(localStorage.getItem('patientsDB')) || {};
  const patientKeys = Object.keys(patientsDB);

  const hasOnlyLegacyPatient =
    patientKeys.length === 1 &&
    patientsDB['HC-8472-9910'];

  if (hasOnlyLegacyPatient) {
    localStorage.setItem('patientsDB', JSON.stringify({}));
  }

}

function initializeStorage() {
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify({}));
  }

  if (!localStorage.getItem('patientsDB')) {
    localStorage.setItem('patientsDB', JSON.stringify({}));
  }
}

// Call on page load
removeLegacyMockData();
initializeStorage();

// Login function
function login(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const user = users[normalizedEmail];

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Incorrect password' };
  }

  // Store session
  localStorage.setItem('currentUser', JSON.stringify(user));
  return { success: true, user: user };
}

async function registerAccount(userData) {
  if (!AUTH_CONFIG.useBackend) {
    return registerUser(userData);
  }

  try {
    const payload = {
      email: String(userData.email || '').trim().toLowerCase(),
      password: String(userData.password || '').trim(),
      role: userData.role,
      fullname: userData.fullname,
      fullName: userData.fullname
    };

    const response = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!isBackendSuccessResponse(response, data)) {
      return {
        success: false,
        message: data.message || 'Registration failed'
      };
    }

    const user = buildUserFromBackendResponse(data, userData);
    saveSessionUser(user, data.token || null);

    return { success: true, user, token: data.token || null };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Registration failed'
    };
  }
}

async function loginAccount(email, password) {
  if (!AUTH_CONFIG.useBackend) {
    return login(email, password);
  }

  try {
    const payload = {
      email: String(email || '').trim().toLowerCase(),
      password: String(password || '').trim()
    };

    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!isBackendSuccessResponse(response, data)) {
      return {
        success: false,
        message: data.message || 'Login failed'
      };
    }

    const user = buildUserFromBackendResponse(data, { email });
    saveSessionUser(user, data.token || null);

    return { success: true, user, token: data.token || null };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Login failed'
    };
  }
}

// Logout function
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = '../index.html';
}

function resetDemoData() {
  localStorage.removeItem('users');
  localStorage.removeItem('patientsDB');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  initializeStorage();
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
