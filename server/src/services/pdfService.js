import dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Allow overriding the Gemini model via env; default to a current model
// Using gemini-2.5-flash which is available and fast
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Use v1beta API (supports newer models)
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || "v1beta";

// Helper to construct API URL with API key
const getGeminiApiUrl = (apiKey, model = GEMINI_MODEL, version = GEMINI_API_VERSION) => {
  return `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
};

// Helper to list available models (for debugging)
export const listAvailableModels = async () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY env var; cannot list models.");
      return null;
    }
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(listUrl);
    if (response.ok) {
      const data = await response.json();
      return data.models || [];
    }
    return null;
  } catch (err) {
    console.error("Error listing models:", err);
    return null;
  }
};

// ----------------------
// Extract PDF Text
// ----------------------
export const extractPDFText = async (filePath) => {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;

    let combinedText = "";
    const pages = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      
      // Store page with page number marker
      pages.push({
        pageNum,
        text: pageText
      });
      
      // Format with page markers for AI context
      combinedText += `=== PAGE ${pageNum} ===\n${pageText}\n\n`;
    }

    const rawText = combinedText || "";
    console.log("[PDF] Raw extracted length (pdfjs-dist):", rawText.length);
    console.log("[PDF] Total pages:", pdfDoc.numPages);
    console.log(
      "[PDF] Raw extracted preview:",
      rawText.slice(0, 200).replace(/\s+/g, " ")
    );

    // Return both formatted text (with page markers) and pages array
    return {
      text: rawText,
      pages: pages,
      totalPages: pdfDoc.numPages
    };
  } catch (err) {
    console.error("PDF extract error:", err);
    return {
      text: "",
      pages: [],
      totalPages: 0
    };
  }
};

// ----------------------
// AI Answer Generator
// ----------------------
export const generateAnswer = async (question, pdfText) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY env var; cannot call Gemini.");
      return "Server missing GEMINI_API_KEY configuration.";
    }

    // Try different model/version combinations if the default fails
    // Using models that are actually available based on ListModels API
    const attempts = [
      { model: GEMINI_MODEL, version: GEMINI_API_VERSION },
      { model: "gemini-2.5-flash", version: "v1beta" },
      { model: "gemini-2.5-pro", version: "v1beta" },
      { model: "gemini-2.0-flash", version: "v1beta" },
      { model: "gemini-flash-latest", version: "v1beta" },
      { model: "gemini-pro-latest", version: "v1beta" },
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        const apiUrl = getGeminiApiUrl(process.env.GEMINI_API_KEY, attempt.model, attempt.version);
        console.log(`[GEMINI] Trying model: ${attempt.model} with API version: ${attempt.version}`);
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      "You are an AI assistant. The following text is extracted from a PDF.\n\n" +
                      pdfText +
                      "\n\nNow answer the user's question based ONLY on this PDF content.\n\nQuestion: " +
                      question
                  }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (answer) {
            console.log(`[GEMINI] Successfully used model: ${attempt.model} with API version: ${attempt.version}`);
            return answer;
          }
        } else {
          const errorText = await response.text();
          lastError = { status: response.status, statusText: response.statusText, errorText, model: attempt.model, version: attempt.version };
          console.log(`[GEMINI] Failed with ${attempt.model}/${attempt.version}: ${response.status}`);
          // Continue to next attempt
        }
      } catch (err) {
        console.log(`[GEMINI] Error with ${attempt.model}/${attempt.version}:`, err.message);
        lastError = { error: err.message, model: attempt.model, version: attempt.version };
        // Continue to next attempt
      }
    }

    // If all attempts failed, return error with details
    console.error("Gemini API error: All model/version combinations failed");
    console.error("Last error:", lastError);
    
    // Try to list available models for debugging
    const availableModels = await listAvailableModels();
    if (availableModels && availableModels.length > 0) {
      console.log("Available models:", availableModels.map(m => m.name).join(", "));
    }
    
    return `Gemini API error: Could not find a working model/version combination. Last error: ${lastError?.status || lastError?.error || "Unknown error"}. ${lastError?.errorText ? `Details: ${lastError.errorText}` : ""}`;
  } catch (err) {
    console.error("AI answer error:", err);
    return "Error generating answer.";
  }
};
