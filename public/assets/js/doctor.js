// Search & Record Update logic

let currentPatientId = null;
let qrCodeScanner = null;
let isScannerRunning = false;
let otpModalResolver = null;

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function applyDateInputMax() {
  const maxDate = getTodayDateInputValue();
  const dateInputIds = ['recordDob', 'profileDob'];

  dateInputIds.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (input) {
      input.setAttribute('max', maxDate);
    }
  });
}

function normalizeDoctorText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeDoctorCardId(value) {
  return normalizeDoctorText(value, 20).toUpperCase();
}

function isValidDoctorCardId(value) {
  return /^HC-\d{4}-\d{4}$/.test(normalizeDoctorCardId(value));
}

function normalizeDoctorPhone(value) {
  return normalizeDoctorText(value, 20).replace(/[\s()-]/g, '');
}

function isValidDoctorPhone(value) {
  const normalized = normalizeDoctorPhone(value);
  if (!normalized) return true;
  return /^\+?[1-9]\d{9,14}$/.test(normalized);
}

function normalizeDoctorBloodGroup(value) {
  return normalizeDoctorText(value, 5).toUpperCase();
}

function isValidDoctorBloodGroup(value) {
  const normalized = normalizeDoctorBloodGroup(value);
  if (!normalized) return true;
  return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(normalized);
}

function isValidDoctorDob(value) {
  if (!value) return true;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  const oldest = new Date();
  oldest.setFullYear(now.getFullYear() - 130);
  return dob <= now && dob >= oldest;
}

function toggleDiagnosisCustomInput() {
  const diagnosisSelect = document.getElementById('medicalDiagnosis');
  const customWrap = document.getElementById('medicalDiagnosisCustomWrap');
  const customInput = document.getElementById('medicalDiagnosisCustom');

  if (!diagnosisSelect || !customWrap || !customInput) return;

  if (diagnosisSelect.value === 'Other') {
    customWrap.classList.remove('hidden');
    customInput.required = true;
  } else {
    customWrap.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

function getNormalizedDiagnosisValue() {
  const diagnosisSelect = document.getElementById('medicalDiagnosis');
  const customInput = document.getElementById('medicalDiagnosisCustom');
  const selectedValue = diagnosisSelect ? normalizeDoctorText(diagnosisSelect.value, 500) : '';

  if (!selectedValue) return '';

  if (selectedValue === 'Other') {
    return customInput ? normalizeDoctorText(customInput.value, 500) : '';
  }

  return selectedValue;
}

function toggleTreatmentCustomInput() {
  const treatmentSelect = document.getElementById('medicalTreatment');
  const customWrap = document.getElementById('medicalTreatmentCustomWrap');
  const customInput = document.getElementById('medicalTreatmentCustom');

  if (!treatmentSelect || !customWrap || !customInput) return;

  if (treatmentSelect.value === 'Other') {
    customWrap.classList.remove('hidden');
    customInput.required = true;
  } else {
    customWrap.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

function getNormalizedTreatmentValue() {
  const treatmentSelect = document.getElementById('medicalTreatment');
  const customInput = document.getElementById('medicalTreatmentCustom');
  const selectedValue = treatmentSelect ? normalizeDoctorText(treatmentSelect.value, 400) : '';

  if (!selectedValue) return '';

  if (selectedValue === 'Other') {
    return customInput ? normalizeDoctorText(customInput.value, 400) : '';
  }

  return selectedValue;
}

function formatAllergiesForDisplay(allergies) {
  if (Array.isArray(allergies)) {
    return allergies.length ? allergies.join(', ') : 'Not set';
  }

  if (typeof allergies === 'string' && allergies.trim()) {
    return allergies;
  }

  return 'Not set';
}

function hasIncompleteProfile(patient) {
  return !patient.bloodGroup;
}

function hasAllergyValue(allergies) {
  if (Array.isArray(allergies)) {
    return allergies.length > 0;
  }

  return typeof allergies === 'string' && allergies.trim().length > 0;
}

function hasPhoneValue(phoneValue) {
  return typeof phoneValue === 'string' && phoneValue.trim().length > 0;
}

function toggleInlineProfileInputsVisibility(patient) {
  const dobWrap = document.getElementById('recordDobWrap');
  const bloodWrap = document.getElementById('recordBloodGroupWrap');
  const allergiesWrap = document.getElementById('recordAllergiesWrap');
  const phoneWrap = document.getElementById('recordPhoneWrap');
  const relativePhoneWrap = document.getElementById('recordRelativePhoneWrap');

  if (dobWrap) {
    if (patient && patient.dob) {
      dobWrap.classList.add('hidden');
    } else {
      dobWrap.classList.remove('hidden');
    }
  }

  if (bloodWrap) {
    if (patient && patient.bloodGroup) {
      bloodWrap.classList.add('hidden');
    } else {
      bloodWrap.classList.remove('hidden');
    }
  }

  if (allergiesWrap) {
    if (patient && hasAllergyValue(patient.allergies)) {
      allergiesWrap.classList.add('hidden');
    } else {
      allergiesWrap.classList.remove('hidden');
    }
  }

  if (phoneWrap) {
    if (patient && hasPhoneValue(patient.phone)) {
      phoneWrap.classList.add('hidden');
    } else {
      phoneWrap.classList.remove('hidden');
    }
  }

  if (relativePhoneWrap) {
    if (patient && hasPhoneValue(patient.relativePhone)) {
      relativePhoneWrap.classList.add('hidden');
    } else {
      relativePhoneWrap.classList.remove('hidden');
    }
  }
}

function setInlineProfileInputs(patient) {
  const dobInput = document.getElementById('recordDob');
  const bloodInput = document.getElementById('recordBloodGroup');
  const allergiesInput = document.getElementById('recordAllergies');
  const phoneInput = document.getElementById('recordPhone');
  const relativePhoneInput = document.getElementById('recordRelativePhone');

  if (dobInput) dobInput.value = patient.dob || '';
  if (bloodInput) bloodInput.value = patient.bloodGroup || '';
  if (allergiesInput) {
    allergiesInput.value = Array.isArray(patient.allergies)
      ? patient.allergies.join(', ')
      : (patient.allergies || '');
  }
  if (phoneInput) phoneInput.value = patient.phone || '';
  if (relativePhoneInput) relativePhoneInput.value = patient.relativePhone || '';

  toggleInlineProfileInputsVisibility(patient);
}

function setDoctorProfileStatus(message, isError = false) {
  const status = document.getElementById('doctorProfileStatus');
  if (!status) return;

  status.classList.remove('hidden');
  status.className = `mt-3 rounded-lg border px-3 py-2 text-xs ${isError ? 'border-red-400/40 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`;
  status.innerText = message;
}

function setDoctorPasswordStatus(message, isError = false) {
  const status = document.getElementById('doctorPasswordStatus');
  if (!status) return;

  status.classList.remove('hidden');
  status.className = `hidden mt-3 rounded-lg border px-3 py-2 text-xs ${isError ? 'border-red-400/40 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`;
  status.classList.remove('hidden');
  status.innerText = message;
}

function initDoctorPasswordForm() {
  const form = document.getElementById('doctorPasswordForm');
  if (!form) return;

  const currentInput = document.getElementById('doctorCurrentPassword');
  const newInput = document.getElementById('doctorNewPassword');
  const confirmInput = document.getElementById('doctorConfirmPassword');

  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const currentPassword = currentInput ? String(currentInput.value || '').trim() : '';
    const newPassword = newInput ? String(newInput.value || '').trim() : '';
    const confirmPassword = confirmInput ? String(confirmInput.value || '').trim() : '';

    if (newPassword !== confirmPassword) {
      setDoctorPasswordStatus('New password and confirm password must match.', true);
      return;
    }

    const result = await changePasswordAccount(currentPassword, newPassword);
    if (!result.success) {
      setDoctorPasswordStatus(result.message || 'Failed to change password.', true);
      return;
    }

    if (currentInput) currentInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';
    setDoctorPasswordStatus('Password updated successfully.');
  });
}

async function initDoctorProfileForm(currentUser) {
  const profileForm = document.getElementById('doctorProfileForm');
  if (!profileForm) return;

  const fullNameInput = document.getElementById('doctorFullName');
  const specializationInput = document.getElementById('doctorSpecialization');
  const hospitalInput = document.getElementById('doctorHospitalName');

  const profile = await getMyDoctorProfile();
  const resolvedProfile = profile || {
    fullName: currentUser?.fullname || 'Doctor',
    specialization: currentUser?.specialization || '',
    hospitalName: currentUser?.hospitalName || ''
  };

  if (fullNameInput) fullNameInput.value = resolvedProfile.fullName || '';
  if (specializationInput) specializationInput.value = resolvedProfile.specialization || '';
  if (hospitalInput) hospitalInput.value = resolvedProfile.hospitalName || '';

  profileForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!profileForm.reportValidity()) {
      return;
    }

    const payload = {
      fullName: fullNameInput ? fullNameInput.value.trim() : '',
      specialization: specializationInput ? specializationInput.value.trim() : '',
      hospitalName: hospitalInput ? hospitalInput.value.trim() : ''
    };

    const result = await updateMyDoctorProfile(payload);
    if (!result.success) {
      setDoctorProfileStatus(result.message || 'Failed to update doctor profile', true);
      return;
    }

    const updatedUser = getCurrentUser();
    const headerName = document.getElementById('headerName');
    if (headerName && updatedUser) {
      headerName.innerText = updatedUser.fullname || 'Doctor';
    }

    setDoctorProfileStatus('Doctor profile updated successfully.');
  });
}

function setupDoctorProfileModal() {
  const openButton = document.getElementById('openDoctorProfileModal');
  const closeButton = document.getElementById('closeDoctorProfileModal');
  const modal = document.getElementById('doctorProfileModal');

  if (!modal) return;

  if (openButton) {
    openButton.addEventListener('click', function() {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', function() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });
}

// Initialize doctor dashboard
function initDoctorDashboard() {
  // Check authentication
  requireAuth();
  
  const currentUser = getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'doctor') {
    window.location.href = '../index.html';
    return;
  }

  // Populate header
  const headerName = document.getElementById('headerName');
  const headerRole = document.getElementById('headerRole');
  if (headerName) {
    headerName.innerText = currentUser.fullname || 'Doctor';
  }

  if (headerRole) {
    headerRole.innerText = 'Doctor';
  }

  initDoctorProfileForm(currentUser);
  initDoctorPasswordForm();
  setupDoctorProfileModal();

  // Setup event listeners
  applyDateInputMax();
  setupSearchForm();
  setupScannerModal();
  setupAddRecordForm();
  setupProfileModal();
  setupOtpModal();
}

function setupScannerModal() {
  const openButton = document.getElementById('openScannerBtn');
  const closeButton = document.getElementById('closeScannerModal');
  const manualButton = document.getElementById('scannerUseManualBtn');

  if (openButton) {
    openButton.addEventListener('click', openScannerModal);
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeScannerModal);
  }

  if (manualButton) {
    manualButton.addEventListener('click', async function() {
      const manualInput = document.getElementById('scannerManualInput');
      const value = manualInput ? manualInput.value.trim() : '';
      if (!value) return;

      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = value;

      await closeScannerModal();
      await searchPatient(value);
    });
  }
}

function setScannerStatus(message, isError = false) {
  const status = document.getElementById('scannerStatus');
  if (!status) return;

  status.innerText = message;
  status.className = isError ? 'mt-3 text-xs text-red-300' : 'mt-3 text-xs text-slate-400';
}

async function openScannerModal() {
  const modal = document.getElementById('scannerModal');
  const manualInput = document.getElementById('scannerManualInput');

  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (manualInput) manualInput.value = '';

  if (typeof Html5Qrcode === 'undefined') {
    setScannerStatus('QR scanner library not loaded. Please refresh and try again.', true);
    return;
  }

  if (!qrCodeScanner) {
    qrCodeScanner = new Html5Qrcode('scannerReader');
  }

  if (isScannerRunning) {
    return;
  }

  try {
    setScannerStatus('Starting camera...');

    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      setScannerStatus('No camera found on this device. Use manual Card ID entry below.', true);
      return;
    }

    const backCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label || ''));
    const selectedCameraId = (backCamera || cameras[0]).id;

    await qrCodeScanner.start(
      selectedCameraId,
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1
      },
      async function(decodedText) {
        const scannedId = String(decodedText || '').trim();
        if (!scannedId) return;

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = scannedId;

        await closeScannerModal();
        await searchPatient(scannedId);
      },
      function() {}
    );

    isScannerRunning = true;
    setScannerStatus('Camera active. Align QR within frame.');
  } catch (error) {
    setScannerStatus(error.message || 'Unable to start camera. Allow permission or use manual Card ID.', true);
  }
}

async function closeScannerModal() {
  const modal = document.getElementById('scannerModal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');

  if (qrCodeScanner && isScannerRunning) {
    try {
      await qrCodeScanner.stop();
      await qrCodeScanner.clear();
    } catch {}
  }

  isScannerRunning = false;
}

// Setup search form
function setupSearchForm() {
  const searchForm = document.getElementById('searchForm');
  if (!searchForm) return;

  searchForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = normalizeDoctorCardId(document.getElementById('searchInput').value);
    if (!isValidDoctorCardId(query)) {
      showSystemMessage('Card ID must be in HC-1234-5678 format.', 'error');
      return;
    }
    await searchPatient(query);
  });
}

// Search for patient by card ID
async function searchPatient(cardId) {
  const normalizedCardId = normalizeDoctorCardId(cardId);
  const workspace = document.getElementById('patientWorkspace');
  const errorMsg = document.getElementById('errorMessage');
  
  if (!normalizedCardId) {
    return;
  }

  if (!isValidDoctorCardId(normalizedCardId)) {
    showSystemMessage('Card ID must be in HC-1234-5678 format.', 'error');
    return;
  }

  const patient = await getPatientByCardId(normalizedCardId);

  if (patient) {
    currentPatientId = patient.cardId || normalizedCardId;
    
    // Populate UI
    const patientName = document.getElementById('patientName');
    const patientId = document.getElementById('patientId');
    const patientBlood = document.getElementById('patientBlood');
    const patientDob = document.getElementById('patientDob');
    const patientPhone = document.getElementById('patientPhone');
    const patientRelativePhone = document.getElementById('patientRelativePhone');
    const patientAllergies = document.getElementById('patientAllergies');

    if (patientName) patientName.innerText = patient.name;
    if (patientId) patientId.innerText = `ID: ${currentPatientId}`;
    if (patientBlood) patientBlood.innerText = patient.bloodGroup || 'Not set';
    if (patientDob) patientDob.innerText = patient.dob || 'Not set';
    if (patientPhone) patientPhone.innerText = patient.phone || 'Not set';
    if (patientRelativePhone) patientRelativePhone.innerText = patient.relativePhone || 'Not set';
    if (patientAllergies) patientAllergies.innerText = formatAllergiesForDisplay(patient.allergies);
    setInlineProfileInputs(patient);

    // Render timeline
    renderTimeline(patient.history || []);

    // Reveal workspace
    if (errorMsg) {
      errorMsg.classList.add('hidden');
    }
    if (workspace) {
      workspace.classList.remove('hidden');
      workspace.classList.add('grid');
    }
  } else {
    // Hide workspace, show error
    if (workspace) {
      workspace.classList.add('hidden');
      workspace.classList.remove('grid');
    }
    if (errorMsg) {
      errorMsg.classList.remove('hidden');
    }
    currentPatientId = null;

    setInlineProfileInputs({ dob: '', bloodGroup: '', allergies: '', phone: '', relativePhone: '' });
    toggleInlineProfileInputsVisibility(null);
  }
}

// Render medical history timeline
function renderTimeline(historyArray) {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  container.innerHTML = ''; 

  if (!historyArray || historyArray.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-500 pl-6 italic">No previous medical history found.</p>`;
    return;
  }

  historyArray.forEach((visit, index) => {
    // Highlight newest record with emerald
    const dotColor = index === 0 ? 'bg-emerald-400 ring-emerald-400/20' : 'bg-slate-600 ring-slate-800';
    const titleColor = index === 0 ? 'text-emerald-400' : 'text-slate-300';

    const recordHTML = `
      <div class="relative pl-6 sm:pl-8">
        <span class="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${dotColor} ring-4"></span>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
          <h3 class="text-sm font-bold ${titleColor}">${visit.date} <span class="text-xs font-normal text-slate-500 ml-2">${visit.time}</span></h3>
          <span class="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">${visit.clinic || 'N/A'}</span>
        </div>
        
        <p class="text-sm font-medium text-white mb-2">Attending: ${visit.doctor}</p>
        <div class="rounded-xl bg-slate-950/50 border border-white/5 p-4 text-sm text-slate-300 leading-relaxed space-y-2">
          <p><span class="text-slate-400">Diagnosis:</span> ${visit.diagnosis || 'Not provided'}</p>
          ${visit.treatment ? `<p><span class="text-slate-400">Treatment:</span> ${visit.treatment}</p>` : ''}
          ${visit.notes ? `<p><span class="text-slate-400">Notes:</span> ${visit.notes}</p>` : ''}
        </div>
      </div>
    `;
    container.innerHTML += recordHTML;
  });
}

// Setup add record form
function setupAddRecordForm() {
  const addRecordForm = document.getElementById('addRecordForm');
  if (!addRecordForm) return;

  const diagnosisSelect = document.getElementById('medicalDiagnosis');
  if (diagnosisSelect) {
    diagnosisSelect.addEventListener('change', toggleDiagnosisCustomInput);
    toggleDiagnosisCustomInput();
  }

  const treatmentSelect = document.getElementById('medicalTreatment');
  if (treatmentSelect) {
    treatmentSelect.addEventListener('change', toggleTreatmentCustomInput);
    toggleTreatmentCustomInput();
  }

  addRecordForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const notesInput = document.getElementById('medicalNotes');
    const treatmentInput = document.getElementById('medicalTreatment');

    const diagnosis = getNormalizedDiagnosisValue();
    const notes = notesInput ? notesInput.value.trim() : '';
    const treatment = treatmentInput ? getNormalizedTreatmentValue() : '';

    const recordDobInput = document.getElementById('recordDob');
    const recordBloodInput = document.getElementById('recordBloodGroup');
    const recordAllergiesInput = document.getElementById('recordAllergies');
    const recordPhoneInput = document.getElementById('recordPhone');
    const recordRelativePhoneInput = document.getElementById('recordRelativePhone');

    const inlineDob = recordDobInput ? recordDobInput.value : '';
    const inlineBloodGroup = recordBloodInput ? normalizeDoctorBloodGroup(recordBloodInput.value) : '';
    const inlineAllergies = recordAllergiesInput ? recordAllergiesInput.value : '';
    const inlinePhone = recordPhoneInput ? normalizeDoctorPhone(recordPhoneInput.value) : '';
    const inlineRelativePhone = recordRelativePhoneInput ? normalizeDoctorPhone(recordRelativePhoneInput.value) : '';

    if (!diagnosis || diagnosis.length < 2 || !currentPatientId) {
      showSystemMessage('Please select diagnosis and ensure a patient is selected.', 'error');
      return;
    }

    const selectedTreatment = treatmentInput ? normalizeDoctorText(treatmentInput.value, 400) : '';
    if (selectedTreatment === 'Other' && (!treatment || treatment.length < 2)) {
      showSystemMessage('Please enter custom treatment or choose a predefined treatment.', 'error');
      return;
    }

    if (!isValidDoctorCardId(currentPatientId)) {
      showSystemMessage('Card ID must be in HC-1234-5678 format.', 'error');
      return;
    }

    if (!isValidDoctorDob(inlineDob)) {
      showSystemMessage('DOB must be a valid past date.', 'error');
      return;
    }

    if (!isValidDoctorBloodGroup(inlineBloodGroup)) {
      showSystemMessage('Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.', 'error');
      return;
    }

    if (!isValidDoctorPhone(inlinePhone) || !isValidDoctorPhone(inlineRelativePhone)) {
      showSystemMessage('Phone number format is invalid. Use international format like +919876543210.', 'error');
      return;
    }

    const patient = await getPatientByCardId(currentPatientId);
    if (!patient) {
      showSystemMessage('Patient not found. Please search again.', 'error');
      return;
    }

    const shouldUpdateProfileInline = inlineDob || inlineBloodGroup || String(inlineAllergies || '').trim() || inlinePhone || inlineRelativePhone;
    if (shouldUpdateProfileInline) {
      const profileUpdate = {
        dob: inlineDob || patient.dob || '',
        bloodGroup: inlineBloodGroup || patient.bloodGroup || '',
        allergies: String(inlineAllergies || '').trim() ? inlineAllergies : patient.allergies,
        phone: inlinePhone || patient.phone || '',
        relativePhone: inlineRelativePhone || patient.relativePhone || ''
      };

      const profileResult = await updatePatientData(currentPatientId, profileUpdate);
      if (!profileResult.success) {
        showSystemMessage(profileResult.message || 'Failed to update patient profile.', 'error');
        return;
      }

      const patientDob = document.getElementById('patientDob');
      const patientBlood = document.getElementById('patientBlood');
      const patientPhone = document.getElementById('patientPhone');
      const patientRelativePhone = document.getElementById('patientRelativePhone');
      const patientAllergies = document.getElementById('patientAllergies');
      if (patientDob) patientDob.innerText = profileResult.patient.dob || 'Not set';
      if (patientBlood) patientBlood.innerText = profileResult.patient.bloodGroup || 'Not set';
      if (patientPhone) patientPhone.innerText = profileResult.patient.phone || 'Not set';
      if (patientRelativePhone) patientRelativePhone.innerText = profileResult.patient.relativePhone || 'Not set';
      if (patientAllergies) patientAllergies.innerText = formatAllergiesForDisplay(profileResult.patient.allergies);
      setInlineProfileInputs(profileResult.patient);

      // Frontend-only mode: patient profile is stored in localStorage
    }

    const refreshedPatient = await getPatientByCardId(currentPatientId);
    if (!refreshedPatient || hasIncompleteProfile(refreshedPatient)) {
      openProfileModal(refreshedPatient || patient);
      return;
    }

    const otpCheck = await runMedicalRecordOtpFlow(currentPatientId);
    if (!otpCheck.success) {
      showSystemMessage(otpCheck.message || 'OTP verification failed. Record not saved.', 'error');
      return;
    }

    await createRecord({ diagnosis, notes, treatment });
  });
}

async function runMedicalRecordOtpFlow(cardId) {
  if (!cardId) {
    return { success: false, message: 'Patient not selected' };
  }

  const otpSendResult = await requestMedicalRecordOtp(cardId);
  if (!otpSendResult.success) {
    return otpSendResult;
  }

  showSystemMessage('OTP sent to patient email.', 'success');

  const otp = await openOtpModal();
  if (!otp || !String(otp).trim()) {
    return { success: false, message: 'OTP entry cancelled' };
  }

  const verifyResult = await verifyMedicalRecordOtp(cardId, otp.trim());
  if (!verifyResult.success) {
    return verifyResult;
  }

  return { success: true };
}

async function createRecord({ diagnosis, notes, treatment }) {
  if (!currentPatientId) {
    showSystemMessage('Select a patient first.', 'error');
    return;
  }

  const currentUser = getCurrentUser();
  const doctorName = currentUser ? currentUser.fullname : 'Doctor';

  // Create new record
  const newRecord = {
    doctor: doctorName,
    clinic: 'HealthCard Clinic',
    diagnosis,
    notes,
    treatment
  };

  // Add record to patient history
  const result = await addMedicalRecord(currentPatientId, newRecord);

  if (result.success) {
    // Re-render the timeline
    renderTimeline(result.history);

    // Refresh patient summary
    const updatedPatient = await getPatientByCardId(currentPatientId);
    const patientAllergies = document.getElementById('patientAllergies');
    if (patientAllergies && updatedPatient) {
      patientAllergies.innerText = formatAllergiesForDisplay(updatedPatient.allergies);
    }

    // Clear the form
    const diagnosisInput = document.getElementById('medicalDiagnosis');
    const diagnosisCustomInput = document.getElementById('medicalDiagnosisCustom');
    const notesInput = document.getElementById('medicalNotes');
    const treatmentInput = document.getElementById('medicalTreatment');
    const treatmentCustomInput = document.getElementById('medicalTreatmentCustom');

    if (diagnosisInput) diagnosisInput.value = '';
    if (diagnosisCustomInput) diagnosisCustomInput.value = '';
    if (notesInput) notesInput.value = '';
    if (treatmentInput) treatmentInput.value = '';
    if (treatmentCustomInput) treatmentCustomInput.value = '';
    toggleDiagnosisCustomInput();
    toggleTreatmentCustomInput();

    // Show success message
    showSuccessMessage('Record added successfully!');
  } else {
    showSystemMessage('Failed to add record: ' + result.message, 'error');
  }
}

function setupProfileModal() {
  const profileForm = document.getElementById('profileForm');
  const cancelButton = document.getElementById('closeProfileModal');

  if (cancelButton) {
    cancelButton.addEventListener('click', closeProfileModal);
  }

  if (!profileForm) return;

  profileForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!currentPatientId) {
      closeProfileModal();
      return;
    }

    const dobInput = document.getElementById('profileDob');
    const bloodInput = document.getElementById('profileBloodGroup');
    const allergiesInput = document.getElementById('profileAllergies');
    const phoneInput = document.getElementById('profilePhone');
    const relativePhoneInput = document.getElementById('profileRelativePhone');

    const dob = dobInput ? dobInput.value : '';
    const bloodGroup = bloodInput ? normalizeDoctorBloodGroup(bloodInput.value) : '';
    const allergies = allergiesInput ? allergiesInput.value : '';
    const phone = phoneInput ? normalizeDoctorPhone(phoneInput.value) : '';
    const relativePhone = relativePhoneInput ? normalizeDoctorPhone(relativePhoneInput.value) : '';

    if (!bloodGroup) {
      showSystemMessage('Blood group is required before adding records.', 'error');
      return;
    }

    if (!isValidDoctorDob(dob)) {
      showSystemMessage('DOB must be a valid past date.', 'error');
      return;
    }

    if (!isValidDoctorBloodGroup(bloodGroup)) {
      showSystemMessage('Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.', 'error');
      return;
    }

    if (!isValidDoctorPhone(phone) || !isValidDoctorPhone(relativePhone)) {
      showSystemMessage('Phone number format is invalid. Use international format like +919876543210.', 'error');
      return;
    }

    const updateResult = await updatePatientData(currentPatientId, {
      dob,
      bloodGroup,
      allergies,
      phone,
      relativePhone
    });

    if (!updateResult.success) {
      showSystemMessage(updateResult.message || 'Failed to update patient profile.', 'error');
      return;
    }

    const patientDob = document.getElementById('patientDob');
    const patientBlood = document.getElementById('patientBlood');
    const patientPhone = document.getElementById('patientPhone');
    const patientRelativePhone = document.getElementById('patientRelativePhone');
    const patientAllergies = document.getElementById('patientAllergies');

    if (patientDob) patientDob.innerText = updateResult.patient.dob || 'Not set';
    if (patientBlood) patientBlood.innerText = updateResult.patient.bloodGroup || 'Not set';
    if (patientPhone) patientPhone.innerText = updateResult.patient.phone || 'Not set';
    if (patientRelativePhone) patientRelativePhone.innerText = updateResult.patient.relativePhone || 'Not set';
    if (patientAllergies) patientAllergies.innerText = formatAllergiesForDisplay(updateResult.patient.allergies);

    // Frontend-only mode: patient profile is stored in localStorage

    closeProfileModal();

    const diagnosisInput = document.getElementById('medicalDiagnosis');
    const notesInput = document.getElementById('medicalNotes');
    const treatmentInput = document.getElementById('medicalTreatment');

    const diagnosis = diagnosisInput ? getNormalizedDiagnosisValue() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const treatment = treatmentInput ? getNormalizedTreatmentValue() : '';

    if (diagnosis) {
      await createRecord({ diagnosis, notes, treatment });
    }
  });
}

function openProfileModal(patient) {
  const modal = document.getElementById('profileModal');
  if (!modal) return;

  const dobInput = document.getElementById('profileDob');
  const bloodInput = document.getElementById('profileBloodGroup');
  const allergiesInput = document.getElementById('profileAllergies');
  const phoneInput = document.getElementById('profilePhone');
  const relativePhoneInput = document.getElementById('profileRelativePhone');

  if (dobInput) dobInput.value = patient.dob || '';
  if (bloodInput) bloodInput.value = patient.bloodGroup || '';
  if (allergiesInput) {
    allergiesInput.value = Array.isArray(patient.allergies)
      ? patient.allergies.join(', ')
      : (patient.allergies || '');
  }
  if (phoneInput) phoneInput.value = patient.phone || '';
  if (relativePhoneInput) relativePhoneInput.value = patient.relativePhone || '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Show success message
function showSuccessMessage(message) {
  const existingMsg = document.getElementById('successMessage');
  if (existingMsg) {
    existingMsg.remove();
  }

  const successMsg = document.createElement('div');
  successMsg.id = 'successMessage';
  successMsg.className = 'fixed top-20 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-emerald-200 shadow-lg animate-in slide-in-from-top-2 duration-300';
  successMsg.innerText = message;

  document.body.appendChild(successMsg);

  setTimeout(() => {
    successMsg.classList.add('animate-out', 'fade-out', 'slide-out-to-top-2');
    setTimeout(() => successMsg.remove(), 300);
  }, 3000);
}

function showSystemMessage(message, type = 'success') {
  if (type === 'success') {
    showSuccessMessage(message);
    return;
  }

  const existingMsg = document.getElementById('errorToastMessage');
  if (existingMsg) {
    existingMsg.remove();
  }

  const errorMsg = document.createElement('div');
  errorMsg.id = 'errorToastMessage';
  errorMsg.className = 'fixed top-20 right-6 z-50 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-red-200 shadow-lg animate-in slide-in-from-top-2 duration-300';
  errorMsg.innerText = message;

  document.body.appendChild(errorMsg);

  setTimeout(() => {
    errorMsg.classList.add('animate-out', 'fade-out', 'slide-out-to-top-2');
    setTimeout(() => errorMsg.remove(), 300);
  }, 3200);
}

function setupOtpModal() {
  const otpForm = document.getElementById('otpForm');
  const cancelBtn = document.getElementById('cancelOtpModal');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeOtpModal(null));
  }

  if (otpForm) {
    otpForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const otpInput = document.getElementById('otpInput');
      const otp = otpInput ? String(otpInput.value || '').trim() : '';
      if (!/^\d{6}$/.test(otp)) {
        showSystemMessage('Please enter valid 6-digit OTP.', 'error');
        return;
      }
      closeOtpModal(otp);
    });
  }
}

function openOtpModal() {
  const modal = document.getElementById('otpModal');
  const otpInput = document.getElementById('otpInput');

  if (!modal) {
    return Promise.resolve(null);
  }

  if (otpInput) {
    otpInput.value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (otpInput) {
    setTimeout(() => otpInput.focus(), 0);
  }

  return new Promise((resolve) => {
    otpModalResolver = resolve;
  });
}

function closeOtpModal(value) {
  const modal = document.getElementById('otpModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  if (otpModalResolver) {
    const resolve = otpModalResolver;
    otpModalResolver = null;
    resolve(value);
  }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDoctorDashboard);
} else {
  initDoctorDashboard();
}
