// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const crmRoutes = require('./routes/crmRoutes');

const app = express();

const PORT = process.env.PORT || 3000;

// Basic sanity check on important envs
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_CALLER_ID,
  TWILIO_VOICE_WEBHOOK_URL,
  GOOGLE_SHEET_ID
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID || !TWILIO_VOICE_WEBHOOK_URL) {
  console.warn('⚠️ Missing one or more Twilio environment variables.');
}

if (!GOOGLE_SHEET_ID) {
  console.warn('⚠️ GOOGLE_SHEET_ID is not set.');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', crmRoutes);

// Fallback for SPA-style refreshes on root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VIPXCaller backend running on http://localhost:${PORT}`);
});

module.exports = app;