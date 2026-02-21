// QR Generation & Patient Profile logic

// Initialize patient dashboard
async function initPatientDashboard() {
  // Check authentication
  requireAuth();
  
  const currentUser = getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'patient') {
    window.location.href = '../index.html';
    return;
  }

  // Get latest patient data from patientsDB
  const patientData = await getMyPatientProfile();

  // Populate header
  const headerName = document.getElementById('headerName');
  if (headerName) {
    headerName.innerText = currentUser.fullname || 'Patient';
  }

  if (!patientData) {
    showEmptyProfile(currentUser);
    return;
  }

  // Populate card info
  const cardName = document.getElementById('cardName');
  const cardIdDisplay = document.getElementById('cardIdDisplay');
  const cardBlood = document.getElementById('cardBlood');
  const cardDob = document.getElementById('cardDob');
  const cardPhone = document.getElementById('cardPhone');
  const cardRelativePhone = document.getElementById('cardRelativePhone');
  const cardAllergies = document.getElementById('cardAllergies');
  const cardAddress = document.getElementById('cardAddress');

  if (cardName) cardName.innerText = patientData.name;
  if (cardIdDisplay) cardIdDisplay.innerText = `ID: ${patientData.cardId}`;
  if (cardBlood) cardBlood.innerText = patientData.bloodGroup || 'Not set';
  if (cardDob) cardDob.innerText = patientData.dob || 'Not set';
  if (cardPhone) cardPhone.innerText = patientData.phone || 'Not set';
  if (cardRelativePhone) cardRelativePhone.innerText = patientData.relativePhone || 'Not set';
  if (cardAddress) cardAddress.innerText = patientData.address || 'Not set';
  if (cardAllergies) {
    if (Array.isArray(patientData.allergies)) {
      cardAllergies.innerText = patientData.allergies.length ? patientData.allergies.join(', ') : 'Not set';
    } else {
      cardAllergies.innerText = patientData.allergies || 'Not set';
    }
  }

  // Generate QR Code
  generateQRCode(patientData.qrCodeId || patientData.cardId);

  // Populate timeline
  populateTimeline(patientData.history || []);

  setupPatientProfileModal();
  setupPatientProfileForm(patientData);
}

function showEmptyProfile(currentUser) {
  const cardName = document.getElementById('cardName');
  const cardIdDisplay = document.getElementById('cardIdDisplay');
  const cardBlood = document.getElementById('cardBlood');
  const cardDob = document.getElementById('cardDob');
  const cardPhone = document.getElementById('cardPhone');
  const cardRelativePhone = document.getElementById('cardRelativePhone');
  const cardAllergies = document.getElementById('cardAllergies');
  const cardAddress = document.getElementById('cardAddress');

  if (cardName) cardName.innerText = currentUser.fullname || 'Patient';
  if (cardIdDisplay) cardIdDisplay.innerText = `ID: ${currentUser.cardId || '--'}`;
  if (cardBlood) cardBlood.innerText = 'Not set';
  if (cardDob) cardDob.innerText = 'Not set';
  if (cardPhone) cardPhone.innerText = 'Not set';
  if (cardRelativePhone) cardRelativePhone.innerText = 'Not set';
  if (cardAllergies) cardAllergies.innerText = 'Not set';
  if (cardAddress) cardAddress.innerText = 'Not set';

  if (currentUser.cardId) {
    generateQRCode(currentUser.cardId);
  }

  populateTimeline([]);

  setupPatientProfileModal();
  setupPatientProfileForm({ address: '', phone: '', relativePhone: '' });
}

function setupPatientProfileModal() {
  const openButton = document.getElementById('openPatientProfileModal');
  const closeButton = document.getElementById('closePatientProfileModal');
  const modal = document.getElementById('patientProfileModal');

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

function setPatientProfileStatus(message, isError = false) {
  const status = document.getElementById('patientProfileStatus');
  if (!status) return;

  status.classList.remove('hidden');
  status.className = `mt-3 rounded-lg border px-3 py-2 text-xs ${isError ? 'border-red-400/40 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`;
  status.innerText = message;
}

function setPatientPasswordStatus(message, isError = false) {
  const status = document.getElementById('patientPasswordStatus');
  if (!status) return;

  status.classList.remove('hidden');
  status.className = `hidden mt-3 rounded-lg border px-3 py-2 text-xs ${isError ? 'border-red-400/40 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`;
  status.classList.remove('hidden');
  status.innerText = message;
}

function initPatientPasswordForm() {
  const form = document.getElementById('patientPasswordForm');
  if (!form) return;

  const currentInput = document.getElementById('patientCurrentPassword');
  const newInput = document.getElementById('patientNewPassword');
  const confirmInput = document.getElementById('patientConfirmPassword');

  if (form.dataset.passwordBound === 'true') {
    return;
  }

  form.dataset.passwordBound = 'true';
  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const currentPassword = currentInput ? String(currentInput.value || '').trim() : '';
    const newPassword = newInput ? String(newInput.value || '').trim() : '';
    const confirmPassword = confirmInput ? String(confirmInput.value || '').trim() : '';

    if (newPassword !== confirmPassword) {
      setPatientPasswordStatus('New password and confirm password must match.', true);
      return;
    }

    const result = await changePasswordAccount(currentPassword, newPassword);
    if (!result.success) {
      setPatientPasswordStatus(result.message || 'Failed to change password.', true);
      return;
    }

    if (currentInput) currentInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';
    setPatientPasswordStatus('Password updated successfully.');
  });
}

function setupPatientProfileForm(patientData) {
  const form = document.getElementById('patientProfileForm');
  if (!form) return;

  const addressInput = document.getElementById('patientAddressInput');
  const phoneInput = document.getElementById('patientPhoneInput');
  const relativePhoneInput = document.getElementById('patientRelativePhoneInput');

  if (addressInput) addressInput.value = patientData.address || '';
  if (phoneInput) phoneInput.value = patientData.phone || '';
  if (relativePhoneInput) relativePhoneInput.value = patientData.relativePhone || '';

  if (form.dataset.bound === 'true') {
    return;
  }

  form.dataset.bound = 'true';
  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const payload = {
      address: addressInput ? addressInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : '',
      relativePhone: relativePhoneInput ? relativePhoneInput.value.trim() : ''
    };

    const result = await updateMyPatientProfile(payload);
    if (!result.success) {
      setPatientProfileStatus(result.message || 'Failed to update patient profile', true);
      return;
    }

    const updatedPatient = result.patient || {};
    const cardPhone = document.getElementById('cardPhone');
    const cardRelativePhone = document.getElementById('cardRelativePhone');
    const cardAddress = document.getElementById('cardAddress');

    if (cardPhone) cardPhone.innerText = updatedPatient.phone || payload.phone || 'Not set';
    if (cardRelativePhone) cardRelativePhone.innerText = updatedPatient.relativePhone || payload.relativePhone || 'Not set';
    if (cardAddress) cardAddress.innerText = updatedPatient.address || payload.address || 'Not set';

    if (phoneInput) phoneInput.value = updatedPatient.phone || payload.phone || '';
    if (relativePhoneInput) relativePhoneInput.value = updatedPatient.relativePhone || payload.relativePhone || '';
    if (addressInput) addressInput.value = updatedPatient.address || payload.address || '';

    setPatientProfileStatus('Patient profile updated successfully.');
  });

  initPatientPasswordForm();
}

// Generate QR Code
function generateQRCode(cardId) {
  const qrcodeElement = document.getElementById('qrcode');
  if (!qrcodeElement) return;

  qrcodeElement.innerHTML = ''; // Clear existing
  const qrSize = window.innerWidth < 640 ? 104 : 90;
  
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrcodeElement, {
      text: cardId,
      width: qrSize,
      height: qrSize,
      colorDark: '#020617', // slate-950
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    qrcodeElement.innerHTML = '<div class="text-xs text-slate-400">QR Code Library not loaded</div>';
  }
}

// Populate medical history timeline
function populateTimeline(history) {
  const timelineContainer = document.getElementById('timelineContainer');
  if (!timelineContainer) return;

  timelineContainer.innerHTML = ''; // Clear loading text

  if (!history || history.length === 0) {
    timelineContainer.innerHTML = '<p class="text-sm text-slate-500 pl-6 italic">No medical history yet.</p>';
    return;
  }

  history.forEach((visit, index) => {
    // Highlight the most recent visit with a green dot, others with slate
    const dotColor = index === 0 ? 'bg-emerald-400 ring-emerald-400/20' : 'bg-slate-600 ring-slate-800';
    const titleColor = index === 0 ? 'text-emerald-400' : 'text-slate-300';

    const recordHTML = `
      <div class="relative pl-6 sm:pl-8">
        <span class="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${dotColor} ring-4"></span>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
          <h3 class="text-sm font-bold ${titleColor}">${visit.date} <span class="text-xs font-normal text-slate-500 ml-2">${visit.time}</span></h3>
          <span class="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">${visit.clinic}</span>
        </div>
        
        <p class="text-sm font-medium text-white mb-2">Attending: ${visit.doctor}</p>
        <div class="rounded-xl bg-slate-950/50 border border-white/5 p-4 text-sm text-slate-300 leading-relaxed space-y-2">
          <p><span class="text-slate-400">Diagnosis:</span> ${visit.diagnosis || 'Not provided'}</p>
          ${visit.treatment ? `<p><span class="text-slate-400">Treatment:</span> ${visit.treatment}</p>` : ''}
          ${visit.notes ? `<p><span class="text-slate-400">Notes:</span> ${visit.notes}</p>` : ''}
        </div>
      </div>
    `;
    timelineContainer.innerHTML += recordHTML;
  });
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPatientDashboard);
} else {
  initPatientDashboard();
}
