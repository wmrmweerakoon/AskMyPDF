import { useState, useEffect } from "react";
import "./App.css";

interface PDF {
  id: number;
  filename: string;
  fileSize: string;
  textLength: number;
  uploadedAt: string;
  hasText: boolean;
}

interface Conversation {
  id: number;
  pdf_id: number;
  question: string;
  answer: string;
  created_at: string;
}

// API base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [selectedPdfId, setSelectedPdfId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationSearchQuery, setConversationSearchQuery] = useState("");

  // Fetch PDF list
  const fetchPDFs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pdf/list`);
      const data = await res.json();
      if (res.ok && data.pdfs) {
        setPdfs(data.pdfs);
        // Auto-select the first PDF if none selected
        if (!selectedPdfId && data.pdfs.length > 0) {
          setSelectedPdfId(data.pdfs[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching PDFs:", err);
    }
  };

  // Fetch conversations for selected PDF
  const fetchConversations = async (pdfId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/pdf/${pdfId}/conversations`);
      const data = await res.json();
      if (res.ok && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  // Load PDFs on component mount
  useEffect(() => {
    fetchPDFs();
  }, []);

  // Fetch conversations when PDF is selected
  useEffect(() => {
    if (selectedPdfId) {
      fetchConversations(selectedPdfId);
      setAnswer(""); // Clear current answer when switching PDFs
      setQuestion(""); // Clear current question
    } else {
      setConversations([]);
    }
  }, [selectedPdfId]);

  // Handle PDF file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setPdfFile(file);
      } else {
        setMessage("Please select a PDF file");
        setTimeout(() => setMessage(""), 3000);
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      setMessage("Please drop a PDF file");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Upload PDF to backend
  const handleUpload = async () => {
    if (!pdfFile) return alert("Please select a PDF");

    const formData = new FormData();
    formData.append("pdf", pdfFile);

    setMessage("Uploading PDF...");
    setAnswer("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pdf/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Error uploading PDF");
        setLoading(false);
        return;
      }
      setMessage(data.message || "Uploaded");
      setPdfFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      // Refresh PDF list and select the new PDF
      await fetchPDFs();
      if (data.pdfId) {
        setSelectedPdfId(data.pdfId);
      }
      setLoading(false);
    } catch (err) {
      setMessage("Error uploading PDF");
      setLoading(false);
      console.error(err);
    }
  };

  // Ask question to AI
  const handleAsk = async () => {
    if (!question) return alert("Enter a question");
    if (!selectedPdfId) return alert("Please select a PDF first");

    setMessage("Fetching answer...");
    setAnswer("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/pdf/${selectedPdfId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Error fetching answer");
        setLoading(false);
        return;
      }
      if (data.answer) {
        setAnswer(data.answer);
        setMessage("");
        setQuestion(""); // Clear question after successful answer
        // Refresh conversations to show the new Q&A
        if (selectedPdfId) {
          await fetchConversations(selectedPdfId);
        }
      } else {
        setMessage(data.message || "No answer returned");
      }
      setLoading(false);
    } catch (err) {
      setMessage("Error fetching answer");
      setLoading(false);
      console.error(err);
    }
  };

  // Delete PDF
  const handleDeletePDF = async (pdfId: number) => {
    if (!confirm("Are you sure you want to delete this PDF?")) return;

    try {
      const res = await fetch(`${API_URL}/api/pdf/${pdfId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh PDF list
        await fetchPDFs();
        // Clear selection if deleted PDF was selected
        if (selectedPdfId === pdfId) {
          setSelectedPdfId(null);
          setAnswer("");
          setQuestion("");
          setConversations([]);
        }
        setMessage("PDF deleted successfully");
      } else {
        setMessage(data.message || "Error deleting PDF");
      }
    } catch (err) {
      setMessage("Error deleting PDF");
      console.error(err);
    }
  };

  // Parse SQLite timestamp (stored as UTC without timezone) as UTC-aware Date
  const parseUtcDate = (dateString: string) => {
    if (!dateString) return new Date();
    // If it already has timezone info, let Date handle it
    if (dateString.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(dateString)) {
      return new Date(dateString);
    }
    // Treat bare "YYYY-MM-DD HH:MM:SS" as UTC
    return new Date(dateString + "Z");
  };

  // Format date for PDF uploadedAt (show local time correctly)
  const formatDate = (dateString: string) => {
    const date = parseUtcDate(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Format date for conversations (shorter, relative)
  const formatConversationDate = (dateString: string) => {
    const date = parseUtcDate(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard!");
    setTimeout(() => setMessage(""), 2000);
  };

  // Filter PDFs based on search query
  const filteredPDFs = pdfs.filter((pdf) =>
    pdf.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) =>
    conv.question.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
    conv.answer.toLowerCase().includes(conversationSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar - PDF History */}
      <div className="w-80 bg-white shadow-xl p-5 overflow-y-auto border-r border-gray-200">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1 text-gray-800 flex items-center gap-2">
            <span className="text-2xl">📚</span> PDF History
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            {pdfs.length} {pdfs.length === 1 ? 'document' : 'documents'}
            {searchQuery && ` • ${filteredPDFs.length} found`}
          </p>
          
          {/* Search Input */}
          {pdfs.length > 0 && (
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="🔍 Search PDFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 border-gray-200 px-4 py-2 pl-10 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Upload Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Upload PDF Document
          </label>
          <div
            className={`file-upload-area mb-3 ${isDragging ? "dragover" : ""} ${pdfFile ? "border-green-400 bg-green-50" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
              disabled={loading}
            />
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <span className="text-4xl mb-2">{pdfFile ? "✅" : "📄"}</span>
              <span className="text-sm text-gray-600 font-medium">
                {pdfFile ? pdfFile.name : "Click to select PDF"}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                {pdfFile ? "Ready to upload" : "or drag and drop"}
              </span>
            </label>
          </div>
          <button
            onClick={handleUpload}
            disabled={loading || !pdfFile}
            className="btn-primary bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-lg w-full disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Uploading...
              </>
            ) : (
              <>
                <span>⬆️</span> Upload PDF
              </>
            )}
          </button>
        </div>

        {/* PDF List */}
        <div className="space-y-3">
          {pdfs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500 text-sm">No PDFs uploaded yet</p>
              <p className="text-gray-400 text-xs mt-1">Upload your first PDF to get started</p>
            </div>
          ) : filteredPDFs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-gray-500 text-sm">No PDFs found</p>
              <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredPDFs.map((pdf) => (
              <div
                key={pdf.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all fade-in ${
                  selectedPdfId === pdf.id
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-md"
                    : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                }`}
                onClick={() => setSelectedPdfId(pdf.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-xl mt-0.5">📄</span>
                    <h3 className="font-semibold text-sm truncate flex-1" title={pdf.filename}>
                      {pdf.filename}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePDF(pdf.id);
                    }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-all ml-2 flex-shrink-0"
                    title="Delete PDF"
                  >
                    🗑️
                  </button>
                </div>
                <div className="text-xs text-gray-500 space-y-1 ml-7">
                  <div className="flex items-center gap-2">
                    <span>💾</span>
                    <span>{pdf.fileSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    <span>{pdf.textLength.toLocaleString()} characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🕒</span>
                    <span>{formatDate(pdf.uploadedAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6">
        <div className="max-w-5xl w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🤖 AI PDF Content Finder
            </h1>
            <p className="text-gray-600">Ask questions and get answers with page citations</p>
          </div>

          {selectedPdfId ? (
            <div className="w-full flex gap-6">
              {/* Main Content Area */}
              <div className="flex-1 bg-white shadow-xl p-6 rounded-xl border border-gray-200 fade-in">
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Selected Document</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {pdfs.find(p => p.id === selectedPdfId)?.filename}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-md hover:bg-blue-100 transition-all"
                  >
                    {showHistory ? "👁️ Hide" : "👁️ Show"} History
                  </button>
                </div>

                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="💭 Ask a question about the PDF..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !loading && handleAsk()}
                    className="w-full border-2 border-gray-200 p-4 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-700 placeholder-gray-400"
                    disabled={loading}
                  />
                  {question && (
                    <button
                      onClick={() => setQuestion("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAsk}
                  disabled={loading || !question}
                  className="btn-primary bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg w-full mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Ask AI
                    </>
                  )}
                </button>

                {message && (
                  <div className={`p-4 rounded-lg mb-4 fade-in border-2 ${
                    message.includes("successfully") || message.includes("Uploaded") || message.includes("Copied")
                      ? "bg-green-50 text-green-800 border-green-200"
                      : message.includes("Error") || message.includes("error")
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {message.includes("successfully") || message.includes("Uploaded") || message.includes("Copied") ? "✅" : message.includes("Error") ? "❌" : "ℹ️"}
                      </span>
                      <span className="font-medium">{message}</span>
                    </div>
                  </div>
                )}

                {answer && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-lg mt-4 border border-gray-200 fade-in">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <span>💡</span> Answer
                      </h2>
                      <button
                        onClick={() => copyToClipboard(answer)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-all flex items-center gap-1"
                        title="Copy answer"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{answer}</p>
                    </div>
                  </div>
                )}

                {/* Conversation History */}
                {showHistory && conversations.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <span>💬</span> Conversation History
                        <span className="text-sm font-normal text-gray-500">
                          ({filteredConversations.length}{conversationSearchQuery ? ` of ${conversations.length}` : ''})
                        </span>
                      </h3>
                    </div>
                    
                    {/* Conversation Search */}
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="🔍 Search conversations..."
                        value={conversationSearchQuery}
                        onChange={(e) => setConversationSearchQuery(e.target.value)}
                        className="w-full border-2 border-gray-200 px-4 py-2 pl-10 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                      />
                      {conversationSearchQuery && (
                        <button
                          onClick={() => setConversationSearchQuery("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-gray-500 text-sm">No conversations found</p>
                        <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {filteredConversations.map((conv) => (
                        <div key={conv.id} className="conversation-card border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300">
                          <div className="mb-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                                <span>❓</span> Question
                              </span>
                              <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{formatConversationDate(conv.created_at)}</span>
                                <button
                                  onClick={() => {
                                    setQuestion(conv.question);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-all"
                                  title="Reuse this question"
                                >
                                  ↻ Reuse
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">{conv.question}</p>
                          </div>
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                                <span>💡</span> Answer
                              </span>
                              <button
                                onClick={() => copyToClipboard(conv.answer)}
                                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-all"
                                title="Copy answer"
                              >
                                📋 Copy
                              </button>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded border border-blue-100">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{conv.answer}</p>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showHistory && conversations.length === 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-6 text-center py-8">
                    <div className="text-5xl mb-3">💭</div>
                    <p className="text-gray-500 font-medium">No conversation history yet</p>
                    <p className="text-gray-400 text-sm mt-1">Ask a question to start a conversation!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-xl p-12 rounded-xl w-full max-w-2xl mx-auto text-center border border-gray-200 fade-in">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AI PDF Content Finder</h2>
              <p className="text-gray-600 mb-6">Upload and select a PDF document to start asking questions</p>
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span>✨</span>
                <span className="text-sm">Get answers with page citations</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
