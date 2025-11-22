// script.js

// If backend is on same origin, leave as ''.
// If deployed (Cloud Run, etc), set to 'https://your-backend-url'
const API_BASE_URL = '';

const phoneInput = document.getElementById('phoneInput');
const manualCallBtn = document.getElementById('manualCallBtn');
const autoCallBtn = document.getElementById('autoCallBtn');
const statusDiv = document.getElementById('status');

function setStatus(message) {
  statusDiv.textContent = message;
}

async function postJSON(path, body) {
  const url = API_BASE_URL + path;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : response.statusText;
    throw new Error(msg);
  }
  return data;
}

// ---------- Manual Call ----------
manualCallBtn.addEventListener('click', async () => {
  const phoneNumber = phoneInput.value.trim();

  if (!phoneNumber) {
    setStatus('Please enter a phone number.');
    return;
  }

  manualCallBtn.disabled = true;
  autoCallBtn.disabled = true;
  setStatus(`Starting manual call to ${phoneNumber}...`);

  try {
    const result = await postJSON('/api/manual-call', { phoneNumber });
    if (result.success) {
      setStatus(`✅ Manual call started to ${phoneNumber}. Call SID: ${result.callSid}`);
    } else {
      setStatus(`⚠️ Could not start manual call: ${result.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(error);
    setStatus(`❌ Error starting manual call: ${error.message}`);
  } finally {
    manualCallBtn.disabled = false;
    autoCallBtn.disabled = false;
  }
});

// ---------- Call Now (AI Auto-Call) ----------
autoCallBtn.addEventListener('click', async () => {
  manualCallBtn.disabled = true;
  autoCallBtn.disabled = true;
  setStatus('Starting AI auto-calls for all contacts...');

  try {
    const result = await postJSON('/api/auto-call-now', {});

    if (!result.success) {
      setStatus(`⚠️ Auto-call failed: ${result.message || 'Unknown error'}`);
      return;
    }

    const total = result.total || 0;
    let summary = `✅ Attempted to start calls for ${total} contacts.\n\n`;

    if (Array.isArray(result.calls)) {
      result.calls.forEach((c, index) => {
        summary += `${index + 1}. ${c.name || '(no name)'} – ${c.phone} – ${c.status}`;
        if (c.callSid) summary += ` (SID: ${c.callSid})`;
        if (c.error) summary += ` [Error: ${c.error}]`;
        summary += '\n';
      });
    }

    setStatus(summary);
  } catch (error) {
    console.error(error);
    setStatus(`❌ Error starting AI auto-calls: ${error.message}`);
  } finally {
    manualCallBtn.disabled = false;
    autoCallBtn.disabled = false;
  }
});