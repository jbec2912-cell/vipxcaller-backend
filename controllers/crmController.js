import { cleanCRMFile } from "../services/crmService.js";

export async function handleCRMUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const cleanedPath = await cleanCRMFile(inputPath);

    res.json({
      message: "CRM file cleaned successfully",
      cleanedFilePath: cleanedPath,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process CRM file" });
  }
}