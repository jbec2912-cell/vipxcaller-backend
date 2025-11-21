// utils/cleanCRM.js
import fs from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// Convert "AISLINN HAYES" -> "Aislinn Hayes"
function toProperCase(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Check if Purchase Date is at least 12 months old
function isPurchase12MonthsOrOlder(dateStr) {
  if (!dateStr) return true; // keep rows with no date

  const d = new Date(dateStr);
  if (isNaN(d)) return true; // if bad date, keep it

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  return d <= oneYearAgo;
}

// Get ONLY the last phone number from the Phone Numbers column
function extractLastPhone(phoneRaw) {
  if (!phoneRaw) return "";

  const matches = phoneRaw.match(/\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g);
  if (!matches || matches.length === 0) return "";

  return matches[matches.length - 1]; // last one only
}

// Main function that reads, cleans, and writes a new CSV
export function cleanCRMFileOnDisk(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, "latin1");

  // Parse everything
  const allRows = parse(raw, {
    skip_empty_lines: true,
  });

  // 1) Delete rows 1–4 (0,1,2,3)
  const rows = allRows.slice(4);

  // 2) First row after that is our header
  const header = rows[0];
  const dataRows = rows.slice(1);

  const cleanedObjs = [];

  for (const row of dataRows) {
    const obj = {};
    header.forEach((colName, i) => {
      obj[colName] = row[i] || "";
    });

    // --- STEP: delete any purchase date not at least 12 months old ---
    if (!isPurchase12MonthsOrOlder(obj["Purchase Date"])) {
      continue;
    }

    // --- STEP: delete vehicle year 2025 or newer (Column B = Vehicle) ---
    const vehicle = obj["Vehicle"] || "";
    const yearMatch = vehicle.match(/^\s*(\d{4})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2025) {
        continue;
      }
    }

    // --- STEP: pull LAST phone number from "Phone Numbers" column ---
    const lastPhone = extractLastPhone(obj["Phone Numbers"]);
    if (!lastPhone) {
      // delete rows that do NOT have a phone number
      continue;
    }
    obj["Phone Numbers"] = lastPhone;

    // --- STEP: delete rows that do NOT have a vehicle ---
    if (!vehicle.trim()) {
      continue;
    }

    // --- STEP: fix CUSTOMER name casing ---
    if (obj["Customer"]) {
      obj["Customer"] = toProperCase(obj["Customer"]);
    }

    cleanedObjs.push(obj);
  }

  // --- STEP: Delete Column M (in your file this is "Unnamed: 13") ---
  const finalHeader = header.filter((h) => h !== "Unnamed: 13");

  const finalRows = cleanedObjs.map((rowObj) =>
    finalHeader.map((colName) => rowObj[colName] ?? "")
  );

  const outputCsv = stringify([finalHeader, ...finalRows], {
    quoted: true,
  });

  fs.writeFileSync(outputPath, outputCsv, "utf8");

  return outputPath;
}