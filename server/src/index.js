import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pdfRoutes from "./routes/pdfRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/pdf", pdfRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientBuildPath));
  
  // Handle React routing - return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
} else {
  // Development route
  app.get("/", (req, res) => {
    res.json({ message: "Backend is running..." });
  });
}

const PORT = Number(process.env.PORT) || 5000;

// Explicitly bind to 0.0.0.0 so Render's port scanner can detect the service
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === "production") {
    console.log("Serving production build");
  }
});
