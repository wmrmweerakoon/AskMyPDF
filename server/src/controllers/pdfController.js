import { extractPDFText, generateAnswer } from "../services/pdfService.js";
import {
  insertPDF,
  getAllPDFs,
  getPDFById,
  getPDFTextById,
  deletePDF,
  insertConversation,
  getConversationsByPDFId,
  formatFileSize,
} from "../services/databaseService.js";
import * as fs from "fs";

// -------------------------
// Upload PDF Controller
// -------------------------
export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF uploaded" });
    }

    const pdfPath = req.file.path;
    const fileSize = req.file.size;
    const originalFilename = req.file.originalname;
    const filename = req.file.filename;

    // extract text
    const extractionResult = await extractPDFText(pdfPath);
    const text = extractionResult.text || "";
    const totalPages = extractionResult.totalPages || 0;
    
    console.log("[UPLOAD] Saved file:", pdfPath, "Extracted chars:", text.length, "Total pages:", totalPages);

    if (!text || text.trim().length === 0) {
      // Delete the file if text extraction failed
      try {
        fs.unlinkSync(pdfPath);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
      return res.status(400).json({
        message:
          "Could not extract text from this PDF (likely image-only/scanned). Please upload a text-based PDF."
      });
    }

    // Save to database
    const pdfId = insertPDF({
      filename,
      originalFilename: originalFilename,
      filePath: pdfPath,
      fileSize,
      extractedText: text,
      textLength: text.length,
    });

    return res.json({
      message: "PDF uploaded & text extracted successfully",
      pdfId,
      size: text.length + " characters extracted",
      filename: originalFilename,
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ message: "Error uploading PDF" });
  }
};

// -------------------------
// List All PDFs Controller
// -------------------------
export const listPDFs = async (req, res) => {
  try {
    const pdfs = getAllPDFs();
    // Format the response
    const formattedPDFs = pdfs.map((pdf) => ({
      id: pdf.id,
      filename: pdf.original_filename,
      fileSize: formatFileSize(pdf.file_size),
      textLength: pdf.text_length,
      uploadedAt: pdf.uploaded_at,
      hasText: pdf.has_text > 0,
    }));

    return res.json({ pdfs: formattedPDFs });
  } catch (err) {
    console.error("List PDFs error:", err);
    res.status(500).json({ message: "Error fetching PDF list" });
  }
};

// -------------------------
// Get PDF by ID Controller
// -------------------------
export const getPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const pdf = getPDFById(parseInt(id));

    if (!pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }

    return res.json({
      id: pdf.id,
      filename: pdf.original_filename,
      fileSize: formatFileSize(pdf.file_size),
      textLength: pdf.text_length,
      uploadedAt: pdf.uploaded_at,
    });
  } catch (err) {
    console.error("Get PDF error:", err);
    res.status(500).json({ message: "Error fetching PDF" });
  }
};

// -------------------------
// Delete PDF Controller
// -------------------------
export const removePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const pdf = getPDFById(parseInt(id));

    if (!pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }

    // Delete file from filesystem
    try {
      if (fs.existsSync(pdf.file_path)) {
        fs.unlinkSync(pdf.file_path);
      }
    } catch (err) {
      console.error("Error deleting file from filesystem:", err);
    }

    // Delete from database
    const deleted = deletePDF(parseInt(id));

    if (deleted) {
      return res.json({ message: "PDF deleted successfully" });
    } else {
      return res.status(500).json({ message: "Error deleting PDF" });
    }
  } catch (err) {
    console.error("Delete PDF error:", err);
    res.status(500).json({ message: "Error deleting PDF" });
  }
};

// -------------------------
// Ask Question Controller (with PDF ID)
// -------------------------
export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const { id } = req.params || {};

    console.log("[ASK] Incoming question:", question, "PDF ID:", id);

    let pdfText = null;
    let pdfId = null;

    if (id) {
      // Ask question about specific PDF
      pdfId = parseInt(id);
      pdfText = getPDFTextById(pdfId);

      if (!pdfText) {
        return res.status(404).json({
          message: "PDF not found or has no extracted text.",
        });
      }
    } else {
      // Legacy: Get the most recently uploaded PDF
      const pdfs = getAllPDFs();
      if (pdfs.length === 0) {
        return res.status(400).json({
          message: "No PDF processed yet. Upload a PDF first.",
        });
      }
      pdfId = pdfs[0].id;
      pdfText = getPDFTextById(pdfId);
    }

    console.log("[ASK] PDF text length:", pdfText.length);

    const answer = await generateAnswer(question, pdfText);

    console.log("[ASK] Answer length:", answer?.length || 0);

    // Save conversation to database
    if (pdfId) {
      insertConversation(pdfId, question, answer);
    }

    return res.json({
      question,
      answer,
      pdfId,
    });
  } catch (err) {
    console.error("Ask error:", err);
    res.status(500).json({ message: "Error generating answer" });
  }
};

// -------------------------
// Get Conversations for a PDF
// -------------------------
export const getConversations = async (req, res) => {
  try {
    const { id } = req.params;
    const pdfId = parseInt(id);

    // Check if PDF exists
    const pdf = getPDFById(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }

    const conversations = getConversationsByPDFId(pdfId);

    return res.json({ conversations });
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Error fetching conversations" });
  }
};
