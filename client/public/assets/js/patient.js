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

  setupResetDemoButton();

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
  const cardAllergies = document.getElementById('cardAllergies');

  if (cardName) cardName.innerText = patientData.name;
  if (cardIdDisplay) cardIdDisplay.innerText = `ID: ${patientData.cardId}`;
  if (cardBlood) cardBlood.innerText = patientData.bloodGroup || 'Not set';
  if (cardDob) cardDob.innerText = patientData.dob || 'Not set';
  if (cardAllergies) {
    if (Array.isArray(patientData.allergies)) {
      cardAllergies.innerText = patientData.allergies.length ? patientData.allergies.join(', ') : 'Not set';
    } else {
      cardAllergies.innerText = patientData.allergies || 'Not set';
    }
  }

  // Generate QR Code
  generateQRCode(patientData.cardId);

  // Populate timeline
  populateTimeline(patientData.history || []);
}

function setupResetDemoButton() {
  const resetButton = document.getElementById('resetDemoBtn');
  if (!resetButton) return;

  resetButton.addEventListener('click', function() {
    const confirmed = window.confirm('This will clear all local demo data (users, patients, session). Continue?');
    if (!confirmed) return;

    resetDemoData();
    window.location.href = '../index.html';
  });
}

function showEmptyProfile(currentUser) {
  const cardName = document.getElementById('cardName');
  const cardIdDisplay = document.getElementById('cardIdDisplay');
  const cardBlood = document.getElementById('cardBlood');
  const cardDob = document.getElementById('cardDob');
  const cardAllergies = document.getElementById('cardAllergies');

  if (cardName) cardName.innerText = currentUser.fullname || 'Patient';
  if (cardIdDisplay) cardIdDisplay.innerText = `ID: ${currentUser.cardId || '--'}`;
  if (cardBlood) cardBlood.innerText = 'Not set';
  if (cardDob) cardDob.innerText = 'Not set';
  if (cardAllergies) cardAllergies.innerText = 'Not set';

  if (currentUser.cardId) {
    generateQRCode(currentUser.cardId);
  }

  populateTimeline([]);
}

// Generate QR Code
function generateQRCode(cardId) {
  const qrcodeElement = document.getElementById('qrcode');
  if (!qrcodeElement) return;

  qrcodeElement.innerHTML = ''; // Clear existing
  
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrcodeElement, {
      text: cardId,
      width: 90,
      height: 90,
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
