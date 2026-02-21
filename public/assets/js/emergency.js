let emergencyScanner = null;
let emergencyScannerRunning = false;

function formatEmergencyDateOnly(dateLike) {
  const date = new Date(dateLike || Date.now());
  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeEmergencyCardId(value) {
  return String(value || '').trim().slice(0, 20).toUpperCase();
}

function isValidEmergencyCardId(value) {
  return /^HC-\d{4}-\d{4}$/.test(normalizeEmergencyCardId(value));
}

function resolveEmergencyApiBaseUrl() {
  if (window.__HC_API_BASE_URL__) {
    return window.__HC_API_BASE_URL__;
  }
  return 'http://localhost:5000';
}

function emergencyApiUrl(path) {
  const base = String(resolveEmergencyApiBaseUrl()).replace(/\/$/, '');
  return `${base}${path}`;
}

function setEmergencyError(message) {
  const errorBox = document.getElementById('emergencyError');
  if (!errorBox) return;

  if (!message) {
    errorBox.classList.add('hidden');
    errorBox.innerText = '';
    return;
  }

  errorBox.classList.remove('hidden');
  errorBox.innerText = message;
}

function renderEmergencyHistory(history = []) {
  const timeline = document.getElementById('emergencyTimeline');
  if (!timeline) return;

  timeline.innerHTML = '';

  if (!history.length) {
    timeline.innerHTML = '<p class="text-sm text-slate-500 pl-6 italic">No previous records.</p>';
    return;
  }

  history.forEach((record, index) => {
    const dateObj = new Date(record.visitDate || record.createdAt || Date.now());
    const dateText = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeText = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const doctorName = (record.doctor && record.doctor.fullName) || 'Doctor';

    const dotColor = index === 0 ? 'bg-red-400 ring-red-400/20' : 'bg-slate-600 ring-slate-800';

    const item = document.createElement('div');
    item.className = 'relative pl-6 sm:pl-8';
    item.innerHTML = `
      <span class="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${dotColor} ring-4"></span>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <h3 class="text-sm font-bold text-slate-200">${dateText} <span class="text-xs font-normal text-slate-500 ml-2">${timeText}</span></h3>
      </div>
      <p class="text-sm font-medium text-white mb-2">Attending: ${doctorName}</p>
      <div class="rounded-xl bg-slate-950/50 border border-white/5 p-4 text-sm text-slate-300 leading-relaxed space-y-2">
        <p><span class="text-slate-400">Diagnosis:</span> ${record.diagnosis || 'Not provided'}</p>
        ${Array.isArray(record.treatments) && record.treatments.length ? `<p><span class="text-slate-400">Treatments:</span> ${record.treatments.join(', ')}</p>` : ''}
        ${record.notes ? `<p><span class="text-slate-400">Notes:</span> ${record.notes}</p>` : ''}
      </div>
    `;

    timeline.appendChild(item);
  });
}

function renderEmergencyData(payload) {
  const result = document.getElementById('emergencyResult');
  if (!result) return;

  const data = payload && payload.emergency ? payload.emergency : null;
  if (!data) {
    result.classList.add('hidden');
    return;
  }

  const allergies = Array.isArray(data.allergies) && data.allergies.length
    ? data.allergies.join(', ')
    : 'Not set';

  document.getElementById('emergencyName').innerText = data.fullName || '--';
  document.getElementById('emergencyCardId').innerText = data.cardId || '--';
  document.getElementById('emergencyQrId').innerText = data.qrCodeId || '--';
  document.getElementById('emergencyBlood').innerText = data.bloodGroup || 'Not set';
  document.getElementById('emergencyDob').innerText = data.dob ? formatEmergencyDateOnly(data.dob) : 'Not set';
  document.getElementById('emergencyPhone').innerText = data.phoneNumber || 'Not set';
  document.getElementById('emergencyRelativePhone').innerText = data.relativePhoneNumber || 'Not set';
  document.getElementById('emergencyAllergies').innerText = allergies;

  renderEmergencyHistory(data.history || []);
  result.classList.remove('hidden');
}

async function fetchEmergencyByQr(qrValue) {
  const normalized = normalizeEmergencyCardId(qrValue);
  if (!normalized) return;

  if (!isValidEmergencyCardId(normalized)) {
    setEmergencyError('Card/QR ID must be in HC-1234-5678 format.');
    renderEmergencyData(null);
    return;
  }

  setEmergencyError('');

  try {
    const response = await fetch(emergencyApiUrl(`/api/emergency/scan/${encodeURIComponent(normalized)}`));
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Patient not found');
    }

    renderEmergencyData(data);
  } catch (error) {
    renderEmergencyData(null);
    setEmergencyError(error.message || 'Failed to fetch emergency data');
  }
}

function setScannerStatus(message, isError = false) {
  const status = document.getElementById('emergencyScannerStatus');
  if (!status) return;

  status.innerText = message;
  status.className = isError ? 'mt-3 text-xs text-red-300' : 'mt-3 text-xs text-slate-400';
}

async function openEmergencyScannerModal() {
  const modal = document.getElementById('emergencyScannerModal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (typeof Html5Qrcode === 'undefined') {
    setScannerStatus('QR scanner library not loaded.', true);
    return;
  }

  if (!emergencyScanner) {
    emergencyScanner = new Html5Qrcode('emergencyScannerReader');
  }

  if (emergencyScannerRunning) {
    return;
  }

  try {
    setScannerStatus('Starting camera...');

    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || !cameras.length) {
      setScannerStatus('No camera found. Enter Card ID manually above.', true);
      return;
    }

    const backCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label || ''));
    const selectedId = (backCamera || cameras[0]).id;

    await emergencyScanner.start(
      selectedId,
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
      async (decodedText) => {
        const scanned = String(decodedText || '').trim();
        if (!scanned) return;

        const normalizedScanned = normalizeEmergencyCardId(scanned);
        if (!isValidEmergencyCardId(normalizedScanned)) {
          setScannerStatus('Scanned value is invalid. Use HC-1234-5678 format.', true);
          return;
        }

        const input = document.getElementById('emergencySearchInput');
        if (input) input.value = normalizedScanned;

        await closeEmergencyScannerModal();
        await fetchEmergencyByQr(normalizedScanned);
      },
      () => {}
    );

    emergencyScannerRunning = true;
    setScannerStatus('Camera active. Align QR in frame.');
  } catch (error) {
    setScannerStatus(error.message || 'Unable to start camera.', true);
  }
}

async function closeEmergencyScannerModal() {
  const modal = document.getElementById('emergencyScannerModal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');

  if (emergencyScanner && emergencyScannerRunning) {
    try {
      await emergencyScanner.stop();
      await emergencyScanner.clear();
    } catch {}
  }

  emergencyScannerRunning = false;
}

function initEmergencyPage() {
  const form = document.getElementById('emergencySearchForm');
  const openScannerBtn = document.getElementById('openEmergencyScannerBtn');
  const closeScannerBtn = document.getElementById('closeEmergencyScannerModal');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = document.getElementById('emergencySearchInput');
      const value = input ? normalizeEmergencyCardId(input.value) : '';
      if (input) input.value = value;
      await fetchEmergencyByQr(value);
    });
  }

  if (openScannerBtn) {
    openScannerBtn.addEventListener('click', openEmergencyScannerModal);
  }

  if (closeScannerBtn) {
    closeScannerBtn.addEventListener('click', closeEmergencyScannerModal);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEmergencyPage);
} else {
  initEmergencyPage();
}
