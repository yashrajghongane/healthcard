const API_BASE = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function getRole() {
  return localStorage.getItem("role");
}

function setAuth(token, role) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
}

function logout() {
  localStorage.clear();
  window.location.href = "/login.html";
}

async function authFetch(url, options = {}) {
  const token = getToken();

  const res = await fetch(API_BASE + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    logout();
  }

  return res.json();
}