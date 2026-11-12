# CareerIQ – AI Resume Analyzer & Career Coach

A full-stack SaaS-style application for resume analysis, ATS scoring, skill gap analysis, job-role matching, career roadmap planning, and AI mentoring.

## Project structure

- `client/` – Vite + React + TypeScript frontend
- `server/` – Express.js backend API

## Supabase setup

The application uses Supabase Authentication, PostgreSQL, and a private Storage
bucket for account and resume data. Resume files are stored in the `resumes`
bucket; PostgreSQL stores only the Storage path, file metadata, extracted text,
and analysis results. The browser uses only the Supabase project URL and anon
(publishable) key. Never put a Supabase service-role key in the frontend.

1. Create a Supabase project.
2. In the Supabase SQL Editor, run
   [`supabase/migrations/20261112000000_create_resume_analyzer_schema.sql`](./supabase/migrations/20261112000000_create_resume_analyzer_schema.sql).
   It creates the seven tables, indexes, auth profile trigger, RLS policies,
   private `resumes` bucket, and owner-only Storage policies. The migration is
   safe to rerun if a previous attempt stopped partway through.
3. In **Authentication → URL Configuration**, set the local site URL to
   `http://localhost:5173` and add your production URL to the redirect allow-list.
   Enable **Allow anonymous sign-ins** under **Authentication → Sign In / Providers → Anonymous Sign-Ins** to use the guest option. Configure email confirmation as required by your deployment.
4. Copy `client/.env.example` to `client/.env` and set the project URL and anon
   (publishable) key from **Project Settings → API**.
5. Copy `server/.env.example` to `server/.env`. Set `GEMINI_API_KEY` from
   Google AI Studio, and set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the same
   Supabase project values used by the client. Keep the Gemini key on the server:
   never add it to a `VITE_` variable or frontend code.
6. In `client/.env`, set `VITE_GEMINI_API_BASE=http://localhost:5002/api`.
   Start the Gemini API and the frontend in separate terminals:

```bash
cd server
npm install
npm run dev:ai
```

```bash
cd client
npm install
npm run dev
npm run build
npm run lint
npm run test:gemini
```

The root path opens the login page; `/welcome` retains the marketing landing
page. Create an account with the registration form, confirm the email if
confirmation is enabled, then log in. Upload PDF or DOCX resumes up to 5 MB.
Or select **Continue as guest** to use a private, anonymous Supabase account
without an email or password. Guest data remains isolated by RLS and tied to
that browser's stored session; signing out ends access to that guest account's
data, which cannot be recovered through email.
Resume text is extracted in the browser, sent to the authenticated local Gemini
API for real AI analysis, then the extracted text and returned analysis are
saved to Supabase. The Job Match Studio compares a saved resume with a pasted
job description and returns an evidence-based match score, missing keywords,
experience gaps, and tailored bullet suggestions. The AI Career Mentor also calls Gemini. Ensure your Google
AI Studio key has Gemini API access and monitor provider quotas and billing.
The Live AI Mock Interview runs a five-question session tailored to a saved
resume and target role, then gives a score and coaching after each answer.
The API uses `gemini-3.1-flash-lite` through Google's Interactions API by default;
resume and mentor requests use `store: false` to avoid retaining sensitive
resume and conversation content in Gemini interaction storage. Change `GEMINI_MODEL` server-side
to select a supported model. If a model returns a temporary overload, rate
limit, or server error, the API retries once (honoring short provider retry
hints) before trying `gemini-3.8-flash`, `gemini-3.7-flash`, and then
`gemini-3.5-flash-lite` by default. Configure this ordered list with
`GEMINI_FALLBACK_MODELS` on the server. If all configured models are at
capacity, wait a minute and retry.

## Database operation smoke test

Create a dedicated test account in the app, then run the following in PowerShell
from `client` with its credentials set in the environment. The test signs in,
uploads a temporary private Storage object, inserts a resume and analysis,
signs out and back in to verify persistence, then deletes the test records:

```powershell
$env:VITE_SUPABASE_URL = "https://your-project.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "your-anon-or-publishable-key"
$env:SUPABASE_TEST_EMAIL = "your-test-account@example.com"
$env:SUPABASE_TEST_PASSWORD = "your-test-account-password"
npm run test:supabase
```

Do not use a production account for the smoke test.

## Existing API server

The Express server is retained for existing non-resume endpoints and its
previous MongoDB implementation. The login, resume upload, resume listing,
analysis history, signed view/download, and delete flows in the frontend use
Supabase directly and do not require the Express server or its MongoDB database.
The separate Gemini API service verifies Supabase access tokens and keeps the
Gemini API key on the server. The Supabase anon key is subject to RLS; no
service-role key is used by the app.

## Legacy backend setup

If you still use the legacy Express endpoints:

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

## Environment variables

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

## Deploy to Vercel

The root `vercel.json` builds the Vite frontend and installs the Gemini API
dependencies. The authenticated Gemini Express API is exposed as a Vercel
serverless function in `api/[...path].js`; the production frontend calls it on
the same origin.

1. Import the GitHub repository into Vercel with the repository root as the
   project root.
2. Add these environment variables in the Vercel project settings. Use the same
   Supabase project for both URL and anon/publishable keys:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (server-only; never prefix it with `VITE_`)
3. Deploy or redeploy the project after adding the variables.
4. Set the Supabase Authentication site URL to the Vercel production URL and
   add that URL to the redirect allow-list.
5. Apply the Supabase migration above and verify the private `resumes` bucket
   exists before testing uploads.

The committed `render.yaml` is an alternative for deploying the Gemini API to
Render instead of using the Vercel serverless function. In that case, set
`VITE_GEMINI_API_BASE` in Vercel to the deployed API URL ending in `/api`, and
configure the Render environment variables documented in `server/.env.example`.

## Scripts

```bash
# Frontend production build
cd client
npm run build

# Backend dev server
cd server
npm run dev
```
