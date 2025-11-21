import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import crmRoutes from "./routes/crmRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// CRM routes
app.use("/api/crm", crmRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});