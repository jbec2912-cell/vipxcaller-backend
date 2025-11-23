// routes/crmRoutes.js
const express = require('express');
const router = express.Router();

const upload = require('../middlewares/uploadMiddleware');
const crmController = require('../controllers/crmController');

// Health check
router.get('/health', crmController.healthCheck);

// Upload + clean + push CRM to Google Sheets
router.post('/upload-crm', upload.single('file'), crmController.uploadCRM);

// Get contacts from Google Sheets
router.get('/contacts', crmController.listContacts);

// Start a Twilio call to a specific phone number
router.post('/call', crmController.makeCall);

module.exports = router;