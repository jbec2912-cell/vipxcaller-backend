import { Router } from "express";
import { handleCRMUpload } from "../controllers/crmController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = Router();

router.post("/upload", upload.single("file"), handleCRMUpload);

export default router;