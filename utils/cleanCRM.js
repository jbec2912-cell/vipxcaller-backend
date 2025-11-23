// utils/cleanCRM.js

/**
 * Cleans raw CRM rows.
 * - Expects an array of objects (keys from CSV headers).
 * - Normalizes phone numbers.
 * - Filters out rows without a valid phone.
 */
function normalizePhone(raw) {
  if (!raw) return null;

  // Keep only digits
  let digits = String(raw).replace(/\D/g, '');

  // Handle leading "1"
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  // Must be 10 digits for US
  if (digits.length !== 10) return null;

  return '+1' + digits;
}

function cleanCRM(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const phone =
        normalizePhone(row.phone) ||
        normalizePhone(row.Phone) ||
        normalizePhone(row.PHONE) ||
        normalizePhone(row.mobile) ||
        normalizePhone(row.Mobile);

      if (!phone) return null;

      const firstName =
        row.firstName ||
        row.FirstName ||
        row.FIRSTNAME ||
        row.fname ||
        row.FName ||
        '';
      const lastName =
        row.lastName ||
        row.LastName ||
        row.LASTNAME ||
        row.lname ||
        row.LName ||
        '';

      return {
        firstName: String(firstName || '').trim(),
        lastName: String(lastName || '').trim(),
        phone
      };
    })
    .filter(Boolean);
}

module.exports = cleanCRM;