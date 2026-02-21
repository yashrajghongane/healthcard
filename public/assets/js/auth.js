// Login/Logout & Session logic

const AUTH_CONFIG = {
  useBackend: Boolean(window.__HC_USE_BACKEND_AUTH__),
  apiBaseUrl: resolveApiBaseUrl()
};

function resolveApiBaseUrl() {
  if (window.__HC_API_BASE_URL__) {
    return window.__HC_API_BASE_URL__;
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  const apiPort = window.__HC_API_PORT__ || '5000';
  const hasCustomPort = Boolean(window.__HC_API_PORT__);

  if (hostname.endsWith('.app.github.dev')) {
    const codespacesHost = hostname.replace(/-\d+\.app\.github\.dev$/, `-${apiPort}.app.github.dev`);
    return `${protocol}//${codespacesHost}`;
  }

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocalhost && !hasCustomPort) {
    return `${protocol}//${hostname}`;
  }

  return `${protocol}//${hostname}:${apiPort}`;
}

function getApiUrl(path) {
  const base = String(AUTH_CONFIG.apiBaseUrl || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function normalizeInputText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeInputEmail(value) {
  return normalizeInputText(value, 120).toLowerCase();
}

function isValidInputEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeInputEmail(value));
}

function isValidInputPassword(value) {
  const normalized = normalizeInputText(value, 72);
  return normalized.length >= 6;
}

function isValidInputName(value) {
  return /^[A-Za-z][A-Za-z .'-]{1,79}$/.test(normalizeInputText(value, 80));
}

function buildNetworkErrorMessage(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname || '';

    if (hostname.endsWith('.app.github.dev')) {
      const stableHost = hostname.replace(/-\d+\.app\.github\.dev$/, '-5000.app.github.dev');
      return `Cannot reach backend API at ${url}. In Codespaces, keep backend running and open app using https://${stableHost}/ (same origin on port 5000).`;
    }
  } catch {
  }

  return `Cannot reach backend API at ${url}. If deployed, verify the API base URL and Railway environment variables; for local development run: cd server && npm run dev`;
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
    const normalizedEmail = normalizeInputEmail(userData.email);
    const normalizedPassword = normalizeInputText(userData.password, 72);
    const normalizedName = normalizeInputText(userData.fullname, 80);

    if (!isValidInputName(normalizedName)) {
      return { success: false, message: 'Enter a valid full name' };
    }

    if (!isValidInputEmail(normalizedEmail)) {
      return { success: false, message: 'Enter a valid email address' };
    }

    if (!isValidInputPassword(normalizedPassword)) {
      return { success: false, message: 'Password must be 6 to 72 characters' };
    }

    if (!['patient', 'doctor'].includes(String(userData.role || ''))) {
      return { success: false, message: 'Invalid role selected' };
    }

    const payload = {
      email: normalizedEmail,
      password: normalizedPassword,
      role: userData.role,
      fullname: normalizedName,
      fullName: normalizedName
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
    const url = getApiUrl('/api/auth/register');
    const isNetworkError = error && (error.name === 'TypeError' || String(error.message || '').includes('Failed to fetch'));
    return {
      success: false,
      message: isNetworkError
        ? buildNetworkErrorMessage(url)
        : (error.message || 'Registration failed')
    };
  }
}

async function loginAccount(email, password) {
  if (!AUTH_CONFIG.useBackend) {
    return login(email, password);
  }

  try {
    const normalizedEmail = normalizeInputEmail(email);
    const normalizedPassword = normalizeInputText(password, 72);

    if (!isValidInputEmail(normalizedEmail) || !isValidInputPassword(normalizedPassword)) {
      return { success: false, message: 'Enter valid email and password' };
    }

    const payload = {
      email: normalizedEmail,
      password: normalizedPassword
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
    const url = getApiUrl('/api/auth/login');
    const isNetworkError = error && (error.name === 'TypeError' || String(error.message || '').includes('Failed to fetch'));
    return {
      success: false,
      message: isNetworkError
        ? buildNetworkErrorMessage(url)
        : (error.message || 'Login failed')
    };
  }
}

async function requestPasswordReset(email) {
  const normalizedEmail = normalizeInputEmail(email);
  if (!normalizedEmail || !isValidInputEmail(normalizedEmail)) {
    return { success: false, message: 'Valid email is required' };
  }

  if (!AUTH_CONFIG.useBackend) {
    return {
      success: false,
      message: 'Forgot password requires backend email service.'
    };
  }

  try {
    const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: normalizedEmail })
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      return {
        success: false,
        message: data.message || 'Failed to send reset code'
      };
    }

    return {
      success: true,
      message: data.message || 'Reset code sent'
    };
  } catch (error) {
    const url = getApiUrl('/api/auth/forgot-password');
    const isNetworkError = error && (error.name === 'TypeError' || String(error.message || '').includes('Failed to fetch'));
    return {
      success: false,
      message: isNetworkError
        ? buildNetworkErrorMessage(url)
        : (error.message || 'Failed to send reset code')
    };
  }
}

async function verifyResetCode(email, code) {
  const normalizedEmail = normalizeInputEmail(email);
  const normalizedCode = normalizeInputText(code, 6);

  if (!normalizedEmail || !normalizedCode) {
    return { success: false, message: 'Email and code are required' };
  }

  if (!isValidInputEmail(normalizedEmail) || !/^\d{6}$/.test(normalizedCode)) {
    return { success: false, message: 'Invalid email or verification code format' };
  }

  if (!AUTH_CONFIG.useBackend) {
    const flow = JSON.parse(localStorage.getItem('passwordResetFlow') || 'null');
    if (!flow || flow.email !== normalizedEmail || flow.code !== normalizedCode || Number(flow.expiresAt || 0) < Date.now()) {
      return { success: false, message: 'Invalid or expired code' };
    }

    localStorage.setItem('passwordResetFlow', JSON.stringify({
      ...flow,
      verified: true
    }));

    return { success: true, message: 'Code verified successfully' };
  }

  try {
    const response = await fetch(getApiUrl('/api/auth/forgot-password/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: normalizedEmail, code: normalizedCode })
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      return {
        success: false,
        message: data.message || 'Invalid or expired code'
      };
    }

    return { success: true, message: data.message || 'Code verified successfully' };
  } catch (error) {
    const url = getApiUrl('/api/auth/forgot-password/verify');
    const isNetworkError = error && (error.name === 'TypeError' || String(error.message || '').includes('Failed to fetch'));
    return {
      success: false,
      message: isNetworkError
        ? buildNetworkErrorMessage(url)
        : (error.message || 'Code verification failed')
    };
  }
}

async function resetForgottenPassword(email, newPassword) {
  const normalizedEmail = normalizeInputEmail(email);
  const trimmedPassword = normalizeInputText(newPassword, 72);

  if (!normalizedEmail || !trimmedPassword) {
    return { success: false, message: 'Email and password are required' };
  }

  if (!isValidInputEmail(normalizedEmail) || !isValidInputPassword(trimmedPassword)) {
    return { success: false, message: 'Invalid email or password format' };
  }

  if (!AUTH_CONFIG.useBackend) {
    const flow = JSON.parse(localStorage.getItem('passwordResetFlow') || 'null');
    const users = JSON.parse(localStorage.getItem('users')) || {};

    if (!flow || !flow.verified || flow.email !== normalizedEmail || Number(flow.expiresAt || 0) < Date.now()) {
      return { success: false, message: 'Reset flow not verified' };
    }

    if (!users[normalizedEmail]) {
      return { success: false, message: 'User not found' };
    }

    users[normalizedEmail] = {
      ...users[normalizedEmail],
      password: trimmedPassword
    };
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.removeItem('passwordResetFlow');

    return { success: true, message: 'Password updated successfully' };
  }

  try {
    const response = await fetch(getApiUrl('/api/auth/forgot-password/reset'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: normalizedEmail, newPassword: trimmedPassword })
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      return {
        success: false,
        message: data.message || 'Password reset failed'
      };
    }

    return { success: true, message: data.message || 'Password updated successfully' };
  } catch (error) {
    const url = getApiUrl('/api/auth/forgot-password/reset');
    const isNetworkError = error && (error.name === 'TypeError' || String(error.message || '').includes('Failed to fetch'));
    return {
      success: false,
      message: isNetworkError
        ? buildNetworkErrorMessage(url)
        : (error.message || 'Password reset failed')
    };
  }
}

async function changePasswordAccount(currentPassword, newPassword) {
  const current = normalizeInputText(currentPassword, 72);
  const next = normalizeInputText(newPassword, 72);

  if (!current || !next) {
    return { success: false, message: 'Current password and new password are required' };
  }

  if (!isValidInputPassword(current) || !isValidInputPassword(next)) {
    return { success: false, message: 'Password must be 6 to 72 characters' };
  }

  if (current === next) {
    return { success: false, message: 'New password must be different from current password' };
  }

  if (!AUTH_CONFIG.useBackend) {
    const currentUser = getCurrentUser();
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const email = normalizeInputEmail(currentUser?.email || '');
    if (!email || !users[email]) {
      return { success: false, message: 'User not found' };
    }

    if (String(users[email].password || '') !== current) {
      return { success: false, message: 'Current password is incorrect' };
    }

    users[email].password = next;
    localStorage.setItem('users', JSON.stringify(users));
    return { success: true, message: 'Password changed successfully' };
  }

  try {
    const token = localStorage.getItem('authToken') || '';
    if (!token) {
      return { success: false, message: 'Please login again to change password' };
    }

    const response = await fetch(getApiUrl('/api/auth/change-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: current,
        newPassword: next
      })
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      return {
        success: false,
        message: data.message || 'Failed to change password'
      };
    }

    return { success: true, message: data.message || 'Password changed successfully' };
  } catch (error) {
    const url = getApiUrl('/api/auth/change-password');
    const isNetworkError = error && (error.name === 'TypeError' || String(error.message || '').includes('Failed to fetch'));
    return {
      success: false,
      message: isNetworkError
        ? buildNetworkErrorMessage(url)
        : (error.message || 'Failed to change password')
    };
  }
}

// Logout function
function logout() {
  localStorage.removeItem('authToken');
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
