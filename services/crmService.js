import path from "path";
import { cleanCRMFileOnDisk } from "../utils/cleanCRM.js";

export async function cleanCRMFile(inputPath) {
  const ext = path.extname(inputPath) || ".csv";
  const outputPath = inputPath.replace(ext, `_CLEANED${ext}`);

  cleanCRMFileOnDisk(inputPath, outputPath);

  return outputPath;
}