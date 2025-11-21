import fs from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

function toProperCase(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function isPurchase12MonthsOrOlder(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d)) return true;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return d <= oneYearAgo;
}

function extractLastPhone(raw) {
  if (!raw) return "";
  const matches = raw.match(/\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g);
  if (!matches) return "";
  return matches[matches.length - 1];
}

export function cleanCRMFileOnDisk(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, "latin1");

  const allRows = parse(raw, { skip_empty_lines: true });

  const rows = allRows.slice(4);
  const header = rows[0];
  const dataRows = rows.slice(1);

  const cleaned = [];

  for (const row of dataRows) {
    const obj = {};
    header.forEach((col, i) => (obj[col] = row[i] || ""));

    if (!isPurchase12MonthsOrOlder(obj["Purchase Date"])) continue;

    const vehicle = obj["Vehicle"] || "";
    const yearMatch = vehicle.match(/^\s*(\d{4})/);
    if (yearMatch && parseInt(yearMatch[1]) >= 2025) continue;

    obj["Phone Numbers"] = extractLastPhone(obj["Phone Numbers"]);
    if (!obj["Phone Numbers"]) continue;

    if (!vehicle.trim()) continue;

    if (obj["Customer"]) obj["Customer"] = toProperCase(obj["Customer"]);

    cleaned.push(obj);
  }

  const finalHeader = header.filter((h) => h !== "Unnamed: 13");

  const finalRows = cleaned.map((r) =>
    finalHeader.map((h) => r[h] ?? "")
  );

  const csvOut = stringify([finalHeader, ...finalRows], { quoted: true });

  fs.writeFileSync(outputPath, csvOut, "utf8");

  return outputPath;
}