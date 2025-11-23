// services/crmService.js
const fs = require('fs');
const { google } = require('googleapis');
const csv = require('csv-parser');
const twilio = require('twilio');
const cleanCRM = require('../utils/cleanCRM');

const {
  GOOGLE_SHEET_ID,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_CALLER_ID,
  TWILIO_VOICE_WEBHOOK_URL
} = process.env;

// ---------- Google Sheets Setup ----------

function getSheetsClient() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Google client email or private key missing. Check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in .env'
    );
  }

  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  return google.sheets({ version: 'v4', auth });
}

/**
 * Reads CSV file, cleans it, and appends to Google Sheet.
 * Returns summary info.
 */
async function uploadAndCleanCRM(csvPath) {
  if (!GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set.');
  }

  const rawRows = await parseCsv(csvPath);
  const cleanedRows = cleanCRM(rawRows);

  if (!cleanedRows.length) {
    return { total: rawRows.length, cleaned: 0 };
  }

  const sheets = getSheetsClient();

  // Convert objects to arrays [firstName, lastName, phone]
  const values = cleanedRows.map((c) => [c.firstName, c.lastName, c.phone]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: 'Sheet1!A2',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values
    }
  });

  return { total: rawRows.length, cleaned: cleanedRows.length };
}

/**
 * Parse CSV into an array of objects.
 */
function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Fetch contacts from Google Sheet.
 * Assumes columns: First Name | Last Name | Phone
 */
async function getContactsFromSheet() {
  if (!GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set.');
  }

  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: 'Sheet1!A2:C1000'
  });

  const rows = response.data.values || [];
  return rows.map((row, index) => ({
    index,
    firstName: row[0] || '',
    lastName: row[1] || '',
    phone: row[2] || ''
  }));
}

// ---------- Twilio Setup ----------

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

/**
 * Starts a Twilio outbound call to the given phone number.
 */
async function startCall(phoneNumber) {
  if (!twilioClient) {
    throw new Error('Twilio client is not configured. Check your env vars.');
  }

  if (!TWILIO_CALLER_ID || !TWILIO_VOICE_WEBHOOK_URL) {
    throw new Error(
      'TWILIO_CALLER_ID or TWILIO_VOICE_WEBHOOK_URL missing from env.'
    );
  }

  const call = await twilioClient.calls.create({
    to: phoneNumber,
    from: TWILIO_CALLER_ID,
    url: TWILIO_VOICE_WEBHOOK_URL
  });

  return call.sid;
}

module.exports = {
  uploadAndCleanCRM,
  getContactsFromSheet,
  startCall
};