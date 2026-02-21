const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FULL_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const HEALTH_CARD_ID_REGEX = /^HC-\d{4}-\d{4}$/;
const OTP_REGEX = /^\d{6}$/;
const BLOOD_GROUP_VALUES = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

export const BLOOD_GROUP_LIST = Array.from(BLOOD_GROUP_VALUES);

export const sanitizeText = (value, maxLength = 2000) => String(value || "").trim().slice(0, maxLength);

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const isValidEmail = (value) => EMAIL_REGEX.test(normalizeEmail(value));

export const isValidPassword = (value) => {
  const password = String(value || "").trim();
  return password.length >= 6 && password.length <= 72;
};

export const normalizeFullName = (value) => sanitizeText(value, 80);

export const isValidFullName = (value) => FULL_NAME_REGEX.test(normalizeFullName(value));

export const normalizeHealthCardId = (value) => sanitizeText(value, 20).toUpperCase();

export const isValidHealthCardId = (value) => HEALTH_CARD_ID_REGEX.test(normalizeHealthCardId(value));

export const isValidOtp = (value) => OTP_REGEX.test(String(value || "").trim());

export const normalizeBloodGroup = (value) => sanitizeText(value, 5).toUpperCase();

export const isValidBloodGroup = (value) => {
  const normalized = normalizeBloodGroup(value);
  return !normalized || BLOOD_GROUP_VALUES.has(normalized);
};

export const normalizePhone = (value) => sanitizeText(value, 20).replace(/[\s()-]/g, "");

export const isValidPhone = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) return true;
  return /^\+?[1-9]\d{9,14}$/.test(normalized);
};

export const normalizeAllergies = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeText(item, 80)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => sanitizeText(item, 80))
      .filter(Boolean);
  }

  return [];
};

export const isValidDob = (value) => {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  const oldestAllowed = new Date();
  oldestAllowed.setFullYear(today.getFullYear() - 130);

  return date <= today && date >= oldestAllowed;
};

export const getValidationErrorMessage = (error, fallback = "Validation failed") => {
  if (!error) return fallback;

  if (error.name === "ValidationError") {
    const firstError = Object.values(error.errors || {})[0];
    return firstError?.message || fallback;
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || "field";
    return `${duplicateField} already exists`;
  }

  return error.message || fallback;
};
