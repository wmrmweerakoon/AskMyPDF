# AI PDF Content Finder

An intelligent web application that extracts text from PDF files and uses Google's Gemini AI to answer questions based on the PDF content.

## 🚀 Features

- **PDF Upload**: Upload PDF files and extract text content
- **AI-Powered Q&A**: Ask questions about the PDF content using Gemini AI
- **Modern UI**: Clean and intuitive React-based frontend
- **Fast & Efficient**: Uses Gemini 2.5 Flash for quick responses

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Vite
- TailwindCSS

### Backend
- Node.js + Express
- PDF.js for text extraction
- Google Gemini API for AI responses

## 🚀 Quick Deploy

Want to deploy this? Check out [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Railway, Render, or other platforms.

**Quick Railway Deploy:**
1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Connect your GitHub repo
4. Add environment variable: `GEMINI_API_KEY=your_key`
5. Deploy! 🎉

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API Key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/wmrmweerakoon/ai-content-finder.git
   cd ai-content-finder
   ```

2. **Install dependencies**

   For the server:
   ```bash
   cd server
   npm install
   ```

   For the client:
   ```bash
   cd client
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the `server` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash  # Optional, defaults to gemini-2.5-flash
   GEMINI_API_VERSION=v1beta       # Optional, defaults to v1beta
   PORT=5000                       # Optional, defaults to 5000
   ```

4. **Run the application**

   Start the server:
   ```bash
   cd server
   npm start
   # or for development with auto-reload
   npm run dev
   ```

   Start the client (in a new terminal):
   ```bash
   cd client
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173 (or the port shown in terminal)
   - Backend API: http://localhost:5000

## 📖 Usage

1. Upload a PDF file using the file input
2. Click "Upload PDF" to extract text from the PDF
3. Type your question in the input field
4. Click "Ask AI" to get an answer based on the PDF content

## 🔧 Configuration

The application automatically tries multiple Gemini model/version combinations to find a working one:
- `gemini-2.5-flash` (default - fast and efficient)
- `gemini-2.5-pro` (more capable)
- `gemini-2.0-flash` (alternative)
- `gemini-flash-latest` (latest flash version)
- `gemini-pro-latest` (latest pro version)

You can override the default model by setting the `GEMINI_MODEL` environment variable.

## 📁 Project Structure

```
ai-content-finder/
├── client/          # React frontend
│   ├── src/
│   └── ...
├── server/          # Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── services/
│   └── uploads/     # PDF uploads directory
└── README.md
```

## 🤝 Contributing

1. Create a new branch for your improvements
2. Make your changes
3. Commit and push to your branch
4. Create a pull request

## 📝 License

This project is open source and available for personal and educational use.

## 👤 Author

**Ruvishan M. Weerakoon**
- GitHub: [@wmrmweerakoon](https://github.com/wmrmweerakoon)
- Email: ruvishan.m.weerakoon@gmail.com

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities
- PDF.js for PDF text extraction
- React and Express communities

