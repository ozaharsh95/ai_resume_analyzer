# 📄 AURA — AI Resume Analyzer & ATS Optimization Engine

A modern, serverless full-stack web application designed to help job seekers audit, score, and optimize their resumes against real-world Applicant Tracking Systems (ATS) and specific job descriptions using advanced LLM reasoning.

Built with **React 19**, **React Router v8**, **Puter.js Cloud Services (Auth, FS, KV, AI)**, **PDF.js**, and **Tailwind CSS v4**.

---

## ✨ Features

### 1. 🤖 Deep AI ATS & Resume Diagnostics

- **Context-Aware Analysis:** Evaluates resumes against specific target job titles, target companies, and job descriptions (or general industry best practices).
- **Multi-Dimensional Scoring:** Provides an overall readiness score (0–100) alongside granular categorical audits:
  - **ATS Suitability & Keyword Parsing:** Detects parsing issues, unreadable formatting, and missing target keywords.
  - **Content & Impact:** Evaluates quantifiable metrics, action verbs, and bullet point effectiveness.
  - **Tone & Professional Style:** Assesses tone consistency, voice, and industry clarity.
  - **Structure & Formatting:** Audits layout hierarchy, visual flow, section headings, and length.
  - **Skills Alignment:** Identifies strong competencies and recommends missing technical/soft skills.
- **Actionable Improvement Plans:** Delivers categorized positive highlights and structured, actionable tips with detailed step-by-step explanations.

### 2. 📑 Client-Side Multi-Page PDF Rasterization

- **High-Resolution Page Rendering:** Leverages `pdfjs-dist` with custom web workers to rasterize multi-page PDF documents into crisp PNG previews directly in the browser.
- **Interactive Multi-Page Viewer:** Features page-by-page inspection, interactive thumbnail navigation, and high-resolution pop-out previews.
- **Direct PDF Download:** Quick-access export allowing users to download or review their original document alongside feedback.

### 3. ☁️ Serverless Cloud Persistence & Puter.js Ecosystem

- **Cloud Document Storage (`Puter FS`):** Automatically syncs uploaded PDF documents and rasterized page thumbnails to isolated cloud file storage.
- **Key-Value Metrics Database (`Puter KV`):** Stores structured audit reports, scores, and metadata with instant retrieval and low latency.
- **Seamless Cloud Authentication (`Puter Auth`):** Frictionless zero-config sign-in with automatic route protection and user session persistence.
- **AI Inference (`Puter AI`):** Employs Claude Opus reasoning models for comprehensive, human-like resume critiques.

### 4. 📊 Dynamic Dashboard & Application Tracker

- **Visual Application Cards:** Interactive cards showcasing overall ATS scores with animated score rings, role details, company tags, and document previews.
- **Real-Time Client-Side Search:** Instant filtering across saved resumes by company name or target job role.
- **Complete Cascade Cleanup:** One-click safe deletion with confirmation modals that removes all raw PDFs, multi-page thumbnails, and KV records across cloud storage.

### 5. 🎨 Polished, Modern UI/UX

- **Design System:** Sleek typography, subtle gradients, glassmorphism banners, and fluid responsive layouts.
- **Interactive Micro-Animations:** Progress indicators, multi-step pipeline visualizers during upload, accordion feedback expansions, and responsive drawer navigation.

---

## 🛠️ Tech Stack

| Domain                 | Technology                               | Description                                                      |
| :--------------------- | :--------------------------------------- | :--------------------------------------------------------------- |
| **Frontend Framework** | **React 19** & **React Router v8**       | Modern SSR/SPA full-stack routing and component model            |
| **Styling & Design**   | **Tailwind CSS v4** + **tw-animate-css** | Modern utility-first styling with custom animation tokens        |
| **Cloud & Backend**    | **Puter.js**                             | Serverless Cloud FS, KV Store, Puter Auth, and Puter AI APIs     |
| **PDF Processing**     | **PDF.js (`pdfjs-dist`)**                | Client-side PDF parsing and multi-page canvas rasterization      |
| **State Management**   | **Zustand**                              | Lightweight global state store for authentication and cloud sync |
| **File Handling**      | **React Dropzone**                       | Drag-and-drop file upload with type validation                   |
| **Build Tooling**      | **Vite v8**                              | Instant HMR and optimized production bundling                    |
| **Language**           | **TypeScript**                           | Strict end-to-end type safety                                    |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** / **pnpm** / **yarn**

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/ai-resume-analyzer.git
   cd ai-resume-analyzer
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`.

---

## 📂 Project Structure

```
ai-resume-analyzer/
├── app/
│   ├── components/            # Reusable UI components
│   │   ├── Accordion.tsx      # Collapsible detailed feedback sections
│   │   ├── ATS.tsx            # ATS score breakdown and checklist
│   │   ├── Details.tsx        # In-depth multi-category evaluation views
│   │   ├── FileUploader.tsx   # Drag-and-drop PDF uploader
│   │   ├── Navbar.tsx         # Global navigation & authentication status
│   │   ├── ResumeCard.tsx     # Dashboard resume preview card with delete action
│   │   ├── ScoreBadge.tsx     # Color-coded metric badges
│   │   ├── ScoreCircle.tsx    # SVG circular progress meter
│   │   └── Summary.tsx        # High-level overview & rating banner
│   ├── constants/             # Evaluation prompts, mock data & format schemas
│   ├── lib/                   # Core business logic and cloud integrations
│   │   ├── pdf2img.ts         # PDF.js rasterizer & multi-page canvas extractor
│   │   ├── puter.ts           # Zustand store wrapping Puter Auth, FS, KV, AI
│   │   └── utils.ts           # JSON extraction, UUID generator, feedback normalizer
│   ├── routes/                # Application pages (React Router v8)
│   │   ├── auth.tsx           # Cloud authentication landing
│   │   ├── home.tsx           # Applications & resumes tracking dashboard
│   │   ├── resume.tsx         # Detailed analysis & interactive document viewer
│   │   ├── upload.tsx         # Upload pipeline with multi-step progress
│   │   └── wipe.tsx           # Maintenance & cache flush utility
│   ├── types/                 # TypeScript interfaces and module declarations
│   ├── app.css                # Custom CSS variables, fonts, and animation utilities
│   └── root.tsx               # Root application layout & Puter.js initialization
├── public/                    # Static assets, icons, and background artwork
└── package.json
```

---

## 🔄 Processing Pipeline

```
[ Upload PDF ] ──► [ PDF.js Multi-Page Rasterization ] ──► [ Puter Cloud FS Storage ]
                                                                     │
[ Puter KV Save ] ◄── [ Feedback JSON Normalization ] ◄── [ Puter AI Claude Analysis ]
       │
[ Interactive Feedback Dashboard & Multi-Page Viewer ]
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
