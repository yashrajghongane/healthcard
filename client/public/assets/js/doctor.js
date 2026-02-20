// Search & Record Update logic

let currentPatientId = null;
let qrCodeScanner = null;
let isScannerRunning = false;
let otpModalResolver = null;

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
  return !patient.dob || !patient.bloodGroup;
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
  if (headerName) {
    headerName.innerText = currentUser.fullname;
  }

  // Setup event listeners
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
    const query = document.getElementById('searchInput').value.trim();
    await searchPatient(query);
  });
}

// Search for patient by card ID
async function searchPatient(cardId) {
  const workspace = document.getElementById('patientWorkspace');
  const errorMsg = document.getElementById('errorMessage');
  
  if (!cardId) {
    return;
  }

  const patient = await getPatientByCardId(cardId);

  if (patient) {
    currentPatientId = patient.cardId || cardId;
    
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

    const profileAlert = document.getElementById('profileMissingAlert');
    if (profileAlert) {
      if (hasIncompleteProfile(patient)) {
        profileAlert.classList.remove('hidden');
      } else {
        profileAlert.classList.add('hidden');
      }
    }

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

    const profileAlert = document.getElementById('profileMissingAlert');
    if (profileAlert) {
      profileAlert.classList.add('hidden');
    }

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

  addRecordForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const diagnosisInput = document.getElementById('medicalDiagnosis');
    const notesInput = document.getElementById('medicalNotes');
    const treatmentInput = document.getElementById('medicalTreatment');

    const diagnosis = diagnosisInput ? diagnosisInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const treatment = treatmentInput ? treatmentInput.value.trim() : '';

    const recordDobInput = document.getElementById('recordDob');
    const recordBloodInput = document.getElementById('recordBloodGroup');
    const recordAllergiesInput = document.getElementById('recordAllergies');
    const recordPhoneInput = document.getElementById('recordPhone');
    const recordRelativePhoneInput = document.getElementById('recordRelativePhone');

    const inlineDob = recordDobInput ? recordDobInput.value : '';
    const inlineBloodGroup = recordBloodInput ? recordBloodInput.value.trim() : '';
    const inlineAllergies = recordAllergiesInput ? recordAllergiesInput.value : '';
    const inlinePhone = recordPhoneInput ? recordPhoneInput.value.trim() : '';
    const inlineRelativePhone = recordRelativePhoneInput ? recordRelativePhoneInput.value.trim() : '';

    if (!diagnosis || !currentPatientId) {
      showSystemMessage('Please enter diagnosis and ensure a patient is selected.', 'error');
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
    const notesInput = document.getElementById('medicalNotes');
    const treatmentInput = document.getElementById('medicalTreatment');

    if (diagnosisInput) diagnosisInput.value = '';
    if (notesInput) notesInput.value = '';
    if (treatmentInput) treatmentInput.value = '';

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
    const bloodGroup = bloodInput ? bloodInput.value.trim() : '';
    const allergies = allergiesInput ? allergiesInput.value : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const relativePhone = relativePhoneInput ? relativePhoneInput.value.trim() : '';

    if (!dob || !bloodGroup) {
      showSystemMessage('DOB and blood group are required before adding records.', 'error');
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
    const profileAlert = document.getElementById('profileMissingAlert');

    if (patientDob) patientDob.innerText = updateResult.patient.dob || 'Not set';
    if (patientBlood) patientBlood.innerText = updateResult.patient.bloodGroup || 'Not set';
    if (patientPhone) patientPhone.innerText = updateResult.patient.phone || 'Not set';
    if (patientRelativePhone) patientRelativePhone.innerText = updateResult.patient.relativePhone || 'Not set';
    if (patientAllergies) patientAllergies.innerText = formatAllergiesForDisplay(updateResult.patient.allergies);
    if (profileAlert) profileAlert.classList.add('hidden');

    // Frontend-only mode: patient profile is stored in localStorage

    closeProfileModal();

    const diagnosisInput = document.getElementById('medicalDiagnosis');
    const notesInput = document.getElementById('medicalNotes');
    const treatmentInput = document.getElementById('medicalTreatment');

    const diagnosis = diagnosisInput ? diagnosisInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const treatment = treatmentInput ? treatmentInput.value.trim() : '';

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
      if (!otp || otp.length !== 6) {
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
