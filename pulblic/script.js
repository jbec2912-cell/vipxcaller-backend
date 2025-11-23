// public/script.js

const uploadForm = document.getElementById('uploadForm');
const crmFileInput = document.getElementById('crmFile');
const uploadStatus = document.getElementById('uploadStatus');

const manualPhoneInput = document.getElementById('manualPhone');
const manualCallBtn = document.getElementById('manualCallBtn');
const manualCallStatus = document.getElementById('manualCallStatus');

const refreshContactsBtn = document.getElementById('refreshContactsBtn');
const contactsBody = document.getElementById('contactsBody');
const contactsStatus = document.getElementById('contactsStatus');

const API_BASE = '/api';

// Helper to show messages
function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.className = 'status ' + (isError ? 'error' : 'success');
}

// ---------- Upload CRM ----------

if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!crmFileInput.files.length) {
      setStatus(uploadStatus, 'Please choose a CSV file.', true);
      return;
    }

    const formData = new FormData();
    formData.append('file', crmFileInput.files[0]);

    setStatus(uploadStatus, 'Uploading and processing...', false);

    try {
      const res = await fetch(`${API_BASE}/upload-crm`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed.');
      }

      const { total, cleaned } = data.summary || {};
      setStatus(
        uploadStatus,
        `Uploaded successfully. Total rows: ${total || 0}, cleaned: ${cleaned || 0}.`
      );

      // Refresh contacts after upload
      await loadContacts();
    } catch (err) {
      console.error(err);
      setStatus(uploadStatus, err.message || 'Upload failed.', true);
    }
  });
}

// ---------- Manual Call Test ----------

if (manualCallBtn) {
  manualCallBtn.addEventListener('click', async () => {
    const phoneNumber = manualPhoneInput.value.trim();
    if (!phoneNumber) {
      setStatus(manualCallStatus, 'Enter a phone number first.', true);
      return;
    }

    setStatus(manualCallStatus, 'Starting call...', false);

    try {
      const res = await fetch(`${API_BASE}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Call failed.');
      }

      setStatus(
        manualCallStatus,
        `Call started successfully. SID: ${data.sid}`
      );
    } catch (err) {
      console.error(err);
      setStatus(manualCallStatus, err.message || 'Call failed.', true);
    }
  });
}

// ---------- Contacts Table ----------

async function loadContacts() {
  setStatus(contactsStatus, 'Loading contacts...', false);
  contactsBody.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/contacts`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load contacts.');
    }

    const contacts = data.contacts || [];

    if (!contacts.length) {
      setStatus(contactsStatus, 'No contacts found.', false);
      return;
    }

    contactsStatus.textContent = '';
    contactsStatus.className = 'status';

    contacts.forEach((contact, idx) => {
      const tr = document.createElement('tr');

      const indexTd = document.createElement('td');
      indexTd.textContent = idx + 1;

      const firstTd = document.createElement('td');
      firstTd.textContent = contact.firstName || '';

      const lastTd = document.createElement('td');
      lastTd.textContent = contact.lastName || '';

      const phoneTd = document.createElement('td');
      phoneTd.textContent = contact.phone || '';

      const callTd = document.createElement('td');
      const callBtn = document.createElement('button');
      callBtn.textContent = 'Call';
      callBtn.addEventListener('click', () =>
        startContactCall(contact.phone)
      );
      callTd.appendChild(callBtn);

      tr.appendChild(indexTd);
      tr.appendChild(firstTd);
      tr.appendChild(lastTd);
      tr.appendChild(phoneTd);
      tr.appendChild(callTd);

      contactsBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    setStatus(contactsStatus, err.message || 'Failed to load contacts.', true);
  }
}

async function startContactCall(phoneNumber) {
  if (!phoneNumber) {
    alert('No phone number for this contact.');
    return;
  }

  try {
    setStatus(contactsStatus, `Starting call to ${phoneNumber}...`, false);

    const res = await fetch(`${API_BASE}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Call failed.');
    }

    setStatus(
      contactsStatus,
      `Call started to ${phoneNumber}. SID: ${data.sid}`
    );
  } catch (err) {
    console.error(err);
    setStatus(contactsStatus, err.message || 'Call failed.', true);
  }
}

// Hook up refresh button
if (refreshContactsBtn) {
  refreshContactsBtn.addEventListener('click', loadContacts);
}

// Load contacts on page load
window.addEventListener('DOMContentLoaded', () => {
  loadContacts().catch((err) => console.error(err));
});