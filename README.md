# CareerIQ – AI Resume Analyzer & Career Coach

A full-stack SaaS-style application for resume analysis, ATS scoring, skill gap analysis, job-role matching, career roadmap planning, and AI mentoring.

## Project structure

- `client/` – Vite + React + TypeScript frontend
- `server/` – Express.js backend API

## Frontend setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Backend setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

## Environment variables

### Frontend (`client/.env.example`)

```env
VITE_API_BASE=http://localhost:5001/api
```

### Backend (`server/.env.example`)

```env
PORT=5001
JWT_SECRET=careeriq-demo-secret
MONGODB_URI=mongodb://localhost:27017/careeriq
OPENAI_API_KEY=
GEMINI_API_KEY=
```

## Features included

- Landing page and product-style marketing layout
- Authentication flow with login and registration
- Protected dashboard screens
- Resume upload and analysis workflow
- ATS score evaluation and explanations
- Job-role matching with strengths and gaps
- Career roadmap timeline
- AI mentor chat mode with context-aware prompts
- Demo mode when external AI credentials are not configured

## Database persistence

The API stores accounts, password hashes, uploaded resume files and extracted text,
resume analyses, career roadmap progress, and mentor conversations in MongoDB.
Set `MONGODB_URI` to a MongoDB connection string before starting the API. For local
development, the default is `mongodb://127.0.0.1:27017/careeriq`; make sure MongoDB
is running. The demo account (`demo@careeriq.ai` / `demo123`) is created in the
database when the API starts.

For deployment, create a MongoDB Atlas database and set `MONGODB_URI` as a secret
environment variable for the API service. The Render Blueprint declares this
variable as required; add it in the Render dashboard after creating the service.
Never put production database credentials in source control or frontend variables.

## Demo mode note

If AI keys are not available, the app uses structured demo analysis so the product remains functional while still clearly labeling generated estimates.

## Deploy to Vercel and Render

The repository includes a root-level `vercel.json` for the Vite frontend and
`render.yaml` for the Express API. Deploy the API first, then configure the
frontend with the API's public URL.

1. Push this project to a GitHub repository.
2. In Render, create a Blueprint from that repository and apply `render.yaml`.
   Render generates a `JWT_SECRET` and provides the API URL. Check
   `https://<your-render-service>.onrender.com/api/health` after it finishes
   deploying.
3. In Vercel, import the same repository and use the repository root as the
   project root. Add the environment variable
   `VITE_API_BASE=https://<your-render-service>.onrender.com/api` before
   deploying. The root `vercel.json` builds `client/` and configures SPA routing.
4. Redeploy the Vercel project after changing `VITE_API_BASE`; Vite embeds this
   value at build time.

The resume analysis and mentor features currently use demo logic without an
AI provider connection. Do not treat demo scores or recommendations as
professional hiring advice.

## Scripts

```bash
# Frontend production build
cd client
npm run build

# Backend dev server
cd server
npm run dev
```
