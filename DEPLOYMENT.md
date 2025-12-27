# Deployment Guide

This guide will help you deploy the AI PDF Content Finder application.

## Prerequisites

- GitHub account
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Account on one of these platforms:
  - [Railway](https://railway.app) (Recommended - easiest)
  - [Render](https://render.com)
  - [Fly.io](https://fly.io)

## Option 1: Deploy to Railway (Recommended)

Railway is the easiest option and works great with Node.js apps.

### Steps:

1. **Prepare your code:**
   - Make sure all changes are committed and pushed to GitHub
   - Your repo should be public or Railway should have access

2. **Create Railway account:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

3. **Deploy:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `ai-content-finder` repository
   - Railway will auto-detect it's a Node.js app

4. **Configure Environment Variables:**
   - Go to your project → Variables
   - Add these variables:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     GEMINI_MODEL=gemini-2.5-flash
     GEMINI_API_VERSION=v1beta
     NODE_ENV=production
     PORT=5000
     ```

5. **Set Build Command:**
   - Go to Settings → Build
   - Build Command: `cd server && npm install && cd ../client && NODE_ENV=development npm install && npm run build`
   - Start Command: `cd server && npm start`
   
   **Important:** We set `NODE_ENV=development` for the client install to ensure devDependencies (TypeScript, Vite) are installed for the build.

6. **Deploy:**
   - Railway will automatically deploy
   - You'll get a URL like `https://your-app.railway.app`

## Option 2: Deploy to Render

### Steps:

1. **Create Render account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `ai-content-finder`

3. **Configure:**
   - **Name:** ai-content-finder
   - **Environment:** Node
   - **Build Command:** `cd server && npm install && cd ../client && npm install && npm run build`
   - **Start Command:** `cd server && npm start`
   - **Instance Type:** Free tier is fine for testing

4. **Environment Variables:**
   - Add these in the Environment section:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     GEMINI_MODEL=gemini-2.5-flash
     GEMINI_API_VERSION=v1beta
     NODE_ENV=production
     PORT=10000
     ```

5. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy your app
   - You'll get a URL like `https://ai-content-finder.onrender.com`

## Option 3: Separate Frontend & Backend (Advanced)

For better scalability, you can deploy frontend and backend separately:

### Frontend (Vercel/Netlify):
1. Build: `cd client && npm run build`
2. Deploy the `client/dist` folder
3. Set environment variable: `VITE_API_URL=https://your-backend-url.com`

### Backend (Railway/Render):
1. Deploy only the server folder
2. Set CORS to allow your frontend domain
3. Set `FRONTEND_URL` environment variable

## Post-Deployment Checklist

- [ ] Test uploading a PDF
- [ ] Test asking a question
- [ ] Verify page citations work
- [ ] Check conversation history
- [ ] Test search functionality
- [ ] Verify file uploads work

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Make sure `FRONTEND_URL` is set correctly
   - Or set CORS to allow all origins in development

2. **Database Issues:**
   - SQLite file should be created automatically
   - Make sure `server/data` directory has write permissions

3. **File Upload Issues:**
   - Make sure `server/uploads` directory exists
   - Check file size limits (default is usually fine)

4. **API Errors:**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API quota/limits

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `GEMINI_MODEL` | Model to use (default: gemini-2.5-flash) | No |
| `GEMINI_API_VERSION` | API version (default: v1beta) | No |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (production/development) | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## Notes

- The app uses SQLite which is fine for single-instance deployments
- For production with multiple users, consider PostgreSQL
- File uploads are stored on the server filesystem
- For production, consider cloud storage (S3, etc.) for uploaded files

