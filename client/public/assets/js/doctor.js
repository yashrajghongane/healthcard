// Search & Record Update logic

let currentPatientId = null;

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
  setupAddRecordForm();
}

// Setup search form
function setupSearchForm() {
  const searchForm = document.getElementById('searchForm');
  if (!searchForm) return;

  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    searchPatient(query);
  });
}

// Search for patient by card ID
function searchPatient(cardId) {
  const workspace = document.getElementById('patientWorkspace');
  const errorMsg = document.getElementById('errorMessage');
  
  if (!cardId) {
    return;
  }

  const patient = getPatientByCardId(cardId);

  if (patient) {
    currentPatientId = cardId;
    
    // Populate UI
    const patientName = document.getElementById('patientName');
    const patientId = document.getElementById('patientId');
    const patientBlood = document.getElementById('patientBlood');
    const patientDob = document.getElementById('patientDob');
    const patientAllergies = document.getElementById('patientAllergies');

    if (patientName) patientName.innerText = patient.name;
    if (patientId) patientId.innerText = `ID: ${cardId}`;
    if (patientBlood) patientBlood.innerText = patient.bloodGroup || 'Not set';
    if (patientDob) patientDob.innerText = patient.dob || 'Not set';
    if (patientAllergies) patientAllergies.innerText = patient.allergies || 'None';

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
        <div class="rounded-xl bg-slate-950/50 border border-white/5 p-4 text-sm text-slate-300 leading-relaxed">
          ${visit.notes}
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

  addRecordForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const notes = document.getElementById('medicalNotes').value.trim();
    if (!notes || !currentPatientId) {
      alert('Please enter medical notes and ensure a patient is selected.');
      return;
    }

    const currentUser = getCurrentUser();
    const doctorName = currentUser ? currentUser.fullname : 'Doctor';

    // Create new record
    const newRecord = {
      doctor: doctorName,
      clinic: 'HealthCard Clinic',
      notes: notes
    };

    // Add record to patient history
    const result = addMedicalRecord(currentPatientId, newRecord);

    if (result.success) {
      // Re-render the timeline
      renderTimeline(result.history);

      // Clear the form
      document.getElementById('medicalNotes').value = '';
      
      // Show success message
      showSuccessMessage('Record added successfully!');
    } else {
      alert('Failed to add record: ' + result.message);
    }
  });
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

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDoctorDashboard);
} else {
  initDoctorDashboard();
}
