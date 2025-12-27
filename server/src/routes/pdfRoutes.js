import express from "express";
import multer from "multer";
import {
  uploadPDF,
  listPDFs,
  getPDF,
  removePDF,
  askQuestion,
  getConversations,
} from "../controllers/pdfController.js";

const router = express.Router();

// configure multer for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Upload PDF
router.post("/upload", upload.single("pdf"), uploadPDF);

// List all PDFs
router.get("/list", listPDFs);

// Get PDF by ID
router.get("/:id", getPDF);

// Delete PDF by ID
router.delete("/:id", removePDF);

// Ask a question about a specific PDF
router.post("/:id/ask", askQuestion);

// Get conversations for a PDF
router.get("/:id/conversations", getConversations);

// Legacy: Ask a question (without PDF ID - uses most recent PDF)
router.post("/ask", askQuestion);

export default router;
