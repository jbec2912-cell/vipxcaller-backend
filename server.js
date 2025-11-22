// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const {
  PORT = 3000,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_CALLER_ID,          // Your Twilio phone number (e.g. +15551234567)
  TWILIO_VOICE_WEBHOOK_URL,  // URL that Twilio should request for call instructions (TwiML / AI)
  GOOGLE_SHEET_ID            // ID of the Google Sheet with your contacts
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID || !TWILIO_VOICE_WEBHOOK_URL) {
  console.warn('⚠️ Missing one or more Twilio environment variables.');
}

if (!GOOGLE_SHEET_ID) {
  console.warn('⚠️ GOOGLE_SHEET_ID is not set. /api/auto-call-now will not work correctly.');
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// ---------- Helper: Read contacts from Google Sheets ----------
async function getContactsFromSheet() {
  // Uses Application Default Credentials (works great on Cloud Run)
  // Locally, set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Adjust the range to match your sheet tab & columns
  // Example: Sheet tab name "Contacts" with columns:
  // A: Name, B: Phone
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: 'Contacts!A2:B', // Skip header row
  });

  const rows = response.data.values || [];

  const contacts = rows
    .filter(row => row[1]) // ensure phone exists
    .map(row => ({
      name: row[0] || '',
      phone: row[1],
    }));

  return contacts;
}

// ---------- Endpoint: Manual Call (single number) ----------
app.post('/api/manual-call', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'phoneNumber is required' });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID || !TWILIO_VOICE_WEBHOOK_URL) {
      return res.status(500).json({
        success: false,
        message: 'Missing Twilio configuration. Check your environment variables.'
      });
    }

    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: TWILIO_CALLER_ID,
      url: TWILIO_VOICE_WEBHOOK_URL,
    });

    console.log('📞 Manual call started:', call.sid, '→', phoneNumber);

    return res.json({
      success: true,
      message: `Manual call started to ${phoneNumber}`,
      callSid: call.sid,
    });
  } catch (error) {
    console.error('❌ Error in /api/manual-call:', error);
    return res.status(500).json({
      success: false,
      message: 'Error starting manual call',
      error: error.message,
    });
  }
});

// ---------- Endpoint: Call Now (AI auto-calls all contacts) ----------
app.post('/api/auto-call-now', async (req, res) => {
  try {
    if (!GOOGLE_SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_SHEET_ID is not set in environment variables.',
      });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID || !TWILIO_VOICE_WEBHOOK_URL) {
      return res.status(500).json({
        success: false,
        message: 'Missing Twilio configuration. Check your environment variables.'
      });
    }

    const contacts = await getContactsFromSheet();

    if (!contacts.length) {
      return res.json({
        success: false,
        message: 'No contacts found in Google Sheet.',
        total: 0,
        calls: [],
      });
    }

    const results = [];
    console.log(`🚀 Starting AI auto-calls for ${contacts.length} contacts...`);

    // Call each contact one by one
    for (const contact of contacts) {
      const { name, phone } = contact;

      try {
        const call = await twilioClient.calls.create({
          to: phone,
          from: TWILIO_CALLER_ID,
          url: TWILIO_VOICE_WEBHOOK_URL,
        });

        console.log('🤖 AI call started:', call.sid, '→', phone, name);

        results.push({
          name,
          phone,
          callSid: call.sid,
          status: 'started',
        });
      } catch (innerError) {
        console.error(`❌ Failed to call ${phone} (${name}):`, innerError.message);
        results.push({
          name,
          phone,
          callSid: null,
          status: 'error',
          error: innerError.message,
        });
      }
    }

    return res.json({
      success: true,
      message: `Attempted to start calls for ${contacts.length} contacts.`,
      total: contacts.length,
      calls: results,
    });
  } catch (error) {
    console.error('❌ Error in /api/auto-call-now:', error);
    return res.status(500).json({
      success: false,
      message: 'Error starting AI auto-calls',
      error: error.message,
    });
  }
});

// ---------- Health Check ----------
app.get('/', (req, res) => {
  res.send('VIPXCaller backend is running 👍');
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});