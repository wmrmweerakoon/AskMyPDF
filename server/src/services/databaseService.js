import Database from "better-sqlite3";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dataDir = path.join(__dirname, "../../data");
// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "pdf_history.db");

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS pdfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    extracted_text TEXT NOT NULL,
    text_length INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pdf_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_pdfs_uploaded_at ON pdfs(uploaded_at DESC);
  CREATE INDEX IF NOT EXISTS idx_conversations_pdf_id ON conversations(pdf_id);
`);

// ----------------------
// PDF Operations
// ----------------------

export const insertPDF = (pdfData) => {
  const stmt = db.prepare(`
    INSERT INTO pdfs (filename, original_filename, file_path, file_size, extracted_text, text_length)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    pdfData.filename,
    pdfData.originalFilename,
    pdfData.filePath,
    pdfData.fileSize,
    pdfData.extractedText,
    pdfData.textLength
  );

  return result.lastInsertRowid;
};

export const getAllPDFs = () => {
  const stmt = db.prepare(`
    SELECT 
      id,
      filename,
      original_filename,
      file_path,
      file_size,
      text_length,
      uploaded_at,
      LENGTH(extracted_text) as has_text
    FROM pdfs
    ORDER BY uploaded_at DESC
  `);

  return stmt.all();
};

export const getPDFById = (id) => {
  const stmt = db.prepare(`
    SELECT * FROM pdfs WHERE id = ?
  `);

  return stmt.get(id);
};

export const getPDFTextById = (id) => {
  const stmt = db.prepare(`
    SELECT extracted_text FROM pdfs WHERE id = ?
  `);

  const result = stmt.get(id);
  return result ? result.extracted_text : null;
};

export const deletePDF = (id) => {
  // First check if PDF exists
  const pdf = getPDFById(id);
  if (!pdf) {
    return false;
  }

  // Delete PDF (conversations will be deleted automatically due to CASCADE)
  const stmt = db.prepare(`DELETE FROM pdfs WHERE id = ?`);
  const result = stmt.run(id);

  return result.changes > 0;
};

// ----------------------
// Conversation Operations
// ----------------------

export const insertConversation = (pdfId, question, answer) => {
  const stmt = db.prepare(`
    INSERT INTO conversations (pdf_id, question, answer)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(pdfId, question, answer);
  return result.lastInsertRowid;
};

export const getConversationsByPDFId = (pdfId) => {
  const stmt = db.prepare(`
    SELECT * FROM conversations 
    WHERE pdf_id = ? 
    ORDER BY created_at ASC
  `);

  return stmt.all(pdfId);
};

// ----------------------
// Utility Functions
// ----------------------

export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

// Close database connection on process exit
process.on("exit", () => {
  db.close();
});

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

