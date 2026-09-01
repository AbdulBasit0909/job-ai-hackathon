JobHunt AI 
An intelligent, WebMCP-powered agent for job discovery, application tailoring, interview prep, and job-search tracking.
Built for the WebMCP Challenge Hackathon (webmcp.devpost.com).

Job seekers today juggle dozens of browser tabs, spreadsheets, and half-tailored resumes. JobHunt AI consolidates the entire journey—from "I need a job" to "I'm interview-ready"—into one connected, AI-native workspace. With WebMCP, AI agents like ChatGPT can now operate the platform alongside you — searching jobs, saving applications, and analyzing resumes through structured tool calls.

 WebMCP Integration
JobHunt AI is a WebMCP-powered web app that exposes its core functionality to AI agents via the browser-native document.modelContext.registerTool() API.

Why WebMCP?
Job hunting is inherently multi-step and data-intensive. WebMCP enables AI agents to handle the tedious parts — searching, saving, tracking — while you focus on strategy and preparation. Every action has two interfaces: one for humans (the UI), one for agents (WebMCP tools).

How It Works
When you visit the dashboard, the app registers 9 tools with the browser's WebMCP API. AI agents (ChatGPT desktop app, Chrome with WebMCP flag) can discover and invoke these tools:

```javascript
// Example: One of our 9 registered WebMCP tools
document.modelContext.registerTool({
  name: "search_jobs",
  description: "Search for job listings by role title, location, and filters",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Job title or role to search for" },
      location: { type: "string", description: "Location or 'remote'" }
    },
    required: ["query"]
  },
  async execute(input) {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input.query, location: input.location })
    });
    const data = await res.json();
    return { jobs: data.jobs?.slice(0, 10) };
  }
});
```

Registered Tools
| Tool | Description | API Route |
|------|-------------|-----------|
| search_jobs | Search jobs by role and location | POST /api/search |
| get_job_details | Get full details of a job listing | GET /api/jobs/[id] |
| save_job | Save a job to the application tracker | POST /api/applications |
| get_applications | View all tracked applications | GET /api/applications |
| update_application_status | Update application status (Saved/Applied/Interviewing/Offer/Rejected) | PATCH /api/applications/[id] |
| get_dashboard_analytics | Get career analytics and metrics | GET /api/analytics |
| analyze_resume | Analyze resume against a job description | POST /api/ai/tailor |
| get_interview_questions | Generate tailored interview prep questions | POST /api/ai/questions |
| find_matching_jobs | Find best-matching jobs from resume text | POST /api/ai/cv-match |

Testing WebMCP
1. Download the ChatGPT desktop app (in-app browser supports WebMCP by default), OR
2. Download Google Chrome 149+, enable chrome://flags/#enable-webmcp-testing, and restart
3. Navigate to the live app URL and the tools will be automatically discovered

 Key Features (The 5 MVP Modules)
1. Semantic AI Job Search & Recommendations (Module A)
Ingests a dataset of 300+ realistic job postings.
Accepts natural-language queries (e.g., "Remote React developer paid over 100k").
Uses Google Gemini to act as an expert recruiter, scoring each job out of 100 and providing a 1-sentence explanation of why it matches the user's query.
2. AI Application Assistant (Module B)
Accepts a user's resume (pasted text) and a target job description.
Identifies Skill Gaps (missing keywords) and Matched Skills.
Generates a perfectly tailored, 250-400 word cover letter referencing specific details from both the resume and the job description.
3. Interactive Interview Preparation (Module C)
Generates 8 tailored interview questions across 3 categories (Behavioral, Technical, Company/Culture) based on the specific job description.
Provides "What a strong answer covers" outlines for each question.
Interactive Mock Interview: Users can type their answer to any question and receive an AI-generated score (0-100) and constructive feedback based on the STAR method.
4. Job Search Management Dashboard (Module D)
A premium Kanban-style tracker to manage saved jobs.
Editable statuses: Saved → Applied → Interviewing → Offer → Rejected/Closed.
Data persists securely in a PostgreSQL database, tied to the authenticated user.
5. Insights & Analytics (Module E)
A real-time analytics dashboard computing:
Total Applications & Response Rate.
Average Time to Response.
Target Salary Benchmark (based on tracked roles).
Dynamic pipeline visualization chart.
🛠 Tech Stack & Architecture
Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
UI Components: Shadcn UI, Radix UI, Lucide Icons, Framer Motion
Backend / API: Next.js Serverless Route Handlers
Database: PostgreSQL (Neon Serverless)
ORM: Prisma
Authentication: Clerk (Industry-standard secure auth)
AI / LLM: Groq (GPT-OSS, Qwen) & Google Gemini (via Vercel AI SDK)
Agent Interface: WebMCP (document.modelContext.registerTool)
Charts: Recharts
Architecture Flow
Next.js Frontend → Clerk Auth Middleware → Next.js API Routes → Vercel AI SDK (Groq/Gemini) & Prisma ORM → Neon PostgreSQL
                                         ↑
                               WebMCP Tools (AI Agent Bridge) → Same API Routes

 Getting Started (Local Setup)
To run this project locally, follow these steps:

1. Prerequisites
Node.js (v18 or higher)
A Neon Database account (for PostgreSQL)
A Clerk account (for Authentication)
Google Gemini API Key
2. Installation
git clone https://github.com/YOUR_USERNAME/job-ai-hackathon.gitcd job-ai-hackathonnpm install
3. Environment Variables
Create a .env file in the root directory and add the following:
# Neon Database
DATABASE_URL="your_neon_postgresql_connection_string"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"

# AI Keys
GOOGLE_GENERATIVE_AI_API_KEY="your_google_gemini_api_key"

4. Database Setup
Push the Prisma schema to your database and seed it with 300 jobs:
npx prisma db push
npx tsx scripts/seed.ts

5. Run the App
npm run dev
Open http://localhost:3000 in your browser.

📂 Project Structure
/app/api/ - Next.js API routes handling AI logic and Database queries.
/app/dashboard/ - Protected routes for the application UI (Search, Tracker, Interview).
/components/ - Reusable UI components.
/lib/ - Database client and utilities.
/prisma/ - Prisma schema definition.
/scripts/ - Database seeding script.
