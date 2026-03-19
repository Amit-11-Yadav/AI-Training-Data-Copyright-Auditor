# AI Training Data Copyright Auditor ⚖️

A full-stack tool that audits AI training datasets for copyright risk, license violations, and legal exposure — covering US (DMCA), EU (AI Act), India (Copyright Act 1957), and Global (SPDX/Creative Commons) jurisdictions.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS v4 · Recharts · react-dropzone |
| Backend | Node.js · Express · Cheerio · Axios · csv-parse |
| AI | Anthropic Claude API (optional) |
| Storage | MongoDB Atlas (optional, in-memory fallback) |

## Quick Start

### 1. Prerequisites

```bash
node --version   # Requires Node.js 18+
```

### 2. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env — add API keys (optional, app works without them)
npm install
npm run dev
# → http://localhost:3001
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

## Environment Variables (server/.env)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3001) |
| `MONGODB_URI` | No | MongoDB Atlas connection string. Falls back to in-memory store. |
| `REDIS_URL` | No | Redis URL. Falls back to direct processing. |
| `ANTHROPIC_API_KEY` | No | Claude API key for AI ToS analysis. Falls back to rule-based. |
| `CLIENT_ORIGIN` | No | Frontend URL for CORS (default: http://localhost:5173) |

## Features

- **3 Input Modes**: Paste URLs, upload CSV, or select a known dataset (Common Crawl, Wikipedia, Reddit, GitHub, arXiv, Shutterstock)
- **Deep Scraping**: Extracts meta license tags, `<link rel="license">`, copyright footer text, HTTP headers
- **robots.txt Parsing**: Checks `User-agent: *` and AI-specific bots (GPTBot, CCBot, Anthropic-AI)
- **SPDX + CC License Detection**: 16+ license types with AI training compatibility mapping
- **ToS NLP Scanning**: Heuristic pattern matching for restrictive language
- **Claude AI Analysis**: Sends ToS text to Claude for plain-English legal summaries
- **Jurisdiction Mapping**: Maps TLD → country → applicable legal framework
- **Fair Use Estimator**: 4-factor fair use probability score (0–100)
- **Risk Scoring Engine**: Points-based algorithm → HIGH / MEDIUM / LOW
- **Live Dashboard**: Real-time progress polling, pie chart, filterable/sortable table
## Deployment

This project consists of two separate applications that can be deployed to free-tier cloud providers. 

### 1. Backend (Render, Railway, or Heroku)

The Node.js/Express backend requires a Node environment.

1. Create a new Web Service on [Render](https://render.com/) or [Railway](https://railway.app/).
2. Connect your GitHub repository and point the root directory to `server/` (or use the build command `cd server && npm install`).
3. Set the start command to `node src/index.js` or `npm start`.
4. Add the following **Environment Variables** in the dashboard:
   - `PORT`: (Usually auto-assigned by the provider, leave if unsure)
   - `CLIENT_ORIGIN`: Set this to your future frontend URL (e.g., `https://your-frontend.vercel.app`)
   - `MONGODB_URI`: Your MongoDB Atlas connection string (optional for persistent storage)
   - `ANTHROPIC_API_KEY`: Your Claude API key (optional for AI insights)
5. Deploy the backend and copy the resulting URL (e.g., `https://my-backend.onrender.com`).

### 2. Frontend (Vercel or Netlify)

The React/Vite frontend is a static single-page application.

1. Go to [Vercel](https://vercel.com/) and create a new project.
2. Connect your GitHub repository.
3. In the project settings, set the **Root Directory** to `client`.
4. The Build Command should automatically detect `npm run build` and Output Directory to `dist`.
5. **IMPORTANT**: You must configure the frontend to talk to your deployed backend. Open `client/vite.config.js` and remove the local proxy, or configure axios globally in `client/src/main.jsx` to use your backend URL:
   ```javascript
   import axios from 'axios';
   axios.defaults.baseURL = 'https://my-backend.onrender.com'; // Your deployed backend URL
   ```
6. Deploy the frontend.

## API Endpoints

```
POST /api/audit          — Start audit (body: {urls:[]} | multipart csv | {dataset: name})
GET  /api/audit/:id      — Get full audit results
GET  /api/audit/:id/status — Poll progress {status, progress, total}
GET  /api/audit/presets/list — List available dataset presets
```

## Running Tests

```bash
cd server
npm test
```

## Architecture

```
React Frontend → Express API → Audit Pipeline
                                 ├── scraper.js         (Cheerio URL scraper)
                                 ├── robotsParser.js    (robots.txt checker)
                                 ├── licenseClassifier.js (SPDX + CC detection)
                                 ├── tosScanner.js      (NLP ToS scanning)
                                 ├── jurisdictionMapper.js (TLD → legal framework)
                                 ├── claudeAnalyzer.js  (Anthropic API)
                                 └── riskScorer.js      (scoring engine)
                               → MongoDB / In-Memory Store
```

## Project Roadmap

See [ai-copyright-auditor-roadmap.html](ai-copyright-auditor-roadmap.html) for the full 6-phase roadmap that was implemented.

## Legal Disclaimer

This tool is provided for informational purposes only and does not constitute legal advice. Always consult a qualified attorney before making training data decisions.
