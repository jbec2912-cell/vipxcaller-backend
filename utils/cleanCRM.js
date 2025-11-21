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

  let allRows;
  try {
    allRows = parse(raw, { skip_empty_lines: true });
  } catch (err) {
    console.error("CSV Parse Error:", err);
    throw new Error("Unable to parse CSV file.");
  }

  if (!allRows || allRows.length < 5) {
    throw new Error("CSV file is missing required rows.");
  }

  // Delete rows 1–4 (0,1,2,3)
  const rows = allRows.slice(4);

  // First row after slice is the header
  let header = rows[0];

  // Remove empty or invalid header columns
  header = header.filter((h) => h && h.trim() && h !== "Unnamed: 13");

  // All remaining rows
  const dataRows = rows.slice(1);
  const cleanedObjs = [];

  for (const row of dataRows) {
    const obj = {};

    header.forEach((colName, i) => {
      obj[colName] = row[i] || "";
    });

    // Remove purchase dates newer than 12 months
    if (!isPurchase12MonthsOrOlder(obj["Purchase Date"])) continue;

    // Remove vehicles 2025 or newer
    const vehicle = obj["Vehicle"] || "";
    const yearMatch = vehicle.match(/^\s*(\d{4})/);
    if (yearMatch && parseInt(yearMatch[1], 10) >= 2025) continue;

    // Extract last phone number
    const lastPhone = extractLastPhone(obj["Phone Numbers"]);
    if (!lastPhone) continue;
    obj["Phone Numbers"] = lastPhone;

    // Remove rows without a vehicle
    if (!vehicle.trim()) continue;

    // Fix CUSTOMER case
    if (obj["Customer"]) obj["Customer"] = toProperCase(obj["Customer"]);

    cleanedObjs.push(obj);
  }

  const finalRows = cleanedObjs.map((rowObj) =>
    header.map((colName) => rowObj[colName] ?? "")
  );

  const outputCsv = stringify([header, ...finalRows], {
    quoted: true,
  });

  fs.writeFileSync(outputPath, outputCsv, "utf8");

  return outputPath;
}