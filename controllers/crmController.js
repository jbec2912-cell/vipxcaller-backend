// controllers/crmController.js
const path = require('path');
const fs = require('fs');
const {
  uploadAndCleanCRM,
  getContactsFromSheet,
  startCall
} = require('../services/crmService');

// GET /api/health
exports.healthCheck = (req, res) => {
  res.json({ status: 'ok', message: 'VIPXCaller backend is running' });
};

// POST /api/upload-crm
exports.uploadCRM = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;

    const summary = await uploadAndCleanCRM(filePath);

    // Optional: clean up uploaded file after processing
    try {
      fs.unlinkSync(path.resolve(filePath));
    } catch (err) {
      console.warn('Could not delete temp CSV file:', err.message);
    }

    res.json({
      success: true,
      message: 'CRM uploaded and processed.',
      summary
    });
  } catch (err) {
    console.error('Error in uploadCRM:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to upload CRM.'
    });
  }
};

// GET /api/contacts
exports.listContacts = async (req, res) => {
  try {
    const contacts = await getContactsFromSheet();
    res.json({ success: true, contacts });
  } catch (err) {
    console.error('Error in listContacts:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch contacts.'
    });
  }
};

// POST /api/call
// Body: { phoneNumber: "+1XXXXXXXXXX" }
exports.makeCall = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required.' });
    }

    const sid = await startCall(phoneNumber);
    res.json({ success: true, sid });
  } catch (err) {
    console.error('Error in makeCall:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to start call.'
    });
  }
};