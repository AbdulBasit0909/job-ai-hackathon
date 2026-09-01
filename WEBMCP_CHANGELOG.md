# WebMCP Changelog — New Work During Hackathon Submission Period

This document distinguishes **prior work** (the existing JobHunt AI platform) from **new WebMCP work** added during the WebMCP Challenge Hackathon submission period (August 25 – September 3, 2026).

---

## Prior Work (Pre-Hackathon)

The following features were built before the hackathon submission period:

- **Next.js 16 full-stack application** with App Router architecture
- **Clerk authentication** with candidate/recruiter role switching
- **PostgreSQL database** (Neon Serverless) with Prisma ORM — models: User, UserResume, Job, Application, ReferralRequest
- **AI Job Search** — multi-source job aggregation from Adzuna, Remotive, LinkedIn, and seed database with deduplication
- **AI Resume Tailor** — cover letter generation, skill gap analysis, course recommendations via Groq/Gemini
- **A/B Resume Testing** — multi-version resume management with per-version response rate analytics
- **Interview Preparation** — AI question generation (8 questions across 3 categories) with answer grading (0-100 STAR method)
- **Application Tracker** — full CRUD with status workflow (Saved → Applied → Interviewing → Offer → Rejected)
- **Analytics Dashboard** — response rates, time-to-response, salary benchmarks, pipeline funnel charts
- **AI Career Copilot** — context-aware chat widget with live dashboard data injection
- **CV Smart Match** — upload resume to automatically find best-matching jobs
- **Chrome Extension** — right-click to save job listings from any website
- **Recruiter Dashboard** — talent discovery, candidate filtering, email referral system via Resend
- **Resume file parsing** — PDF (unpdf), DOCX (mammoth), TXT upload support

---

## New Work: WebMCP Integration (During Hackathon)

The following work was added during the WebMCP Challenge submission period to make JobHunt AI a **WebMCP-powered** application:

### New Files

| File | Purpose |
|------|---------|
| `app/webmcp-tools.tsx` | Client-side WebMCP tool registration — registers 10 tools with `document.modelContext.registerTool()` including composite `smart_job_hunt` |
| `app/page.tsx` | Product landing page with hero, WebMCP showcase, feature grid, and CTAs (replaces redirect) |
| `components/webmcp-activity-feed.tsx` | Real-time agent activity feed showing WebMCP tool calls as they happen |
| `LICENSE` | MIT open source license (required by submission rules) |
| `WEBMCP_CHANGELOG.md` | This document — distinguishes prior work from new WebMCP work |

### Modified Files

| File | Change |
|------|--------|
| `app/dashboard/layout.tsx` | Added imports and rendering of `<WebMCPTools />` and `<WebMCPActivityFeed />` components |
| `app/api/talent/route.ts` | Added Clerk auth check (security fix) |
| `app/api/referrals/route.ts` | Added Clerk auth check to GET handler (security fix) |
| `app/api/upload-resume/route.ts` | Added Clerk auth check (security fix) |
| `app/api/extension/save/route.ts` | Removed insecure `findFirst()` fallback; returns 401 if unauthenticated (security fix) |
| `app/api/resumes/ab-compare/route.ts` | Removed fake AI mock results; returns 503 error on AI failure (correctness fix) |
| `README.md` | Added WebMCP documentation section |

### WebMCP Tools Registered

All 9 tools use the `document.modelContext.registerTool()` API and call existing API routes:

1. **`search_jobs`** → `POST /api/search` — Search jobs by role and location
2. **`get_job_details`** → `GET /api/jobs/[id]` — Get full job details
3. **`save_job`** → `POST /api/applications` — Save job to tracker
4. **`get_applications`** → `GET /api/applications` — View tracked applications
5. **`update_application_status`** → `PATCH /api/applications/[id]` — Update application status
6. **`get_dashboard_analytics`** → `GET /api/analytics` — Get career metrics
7. **`analyze_resume`** → `POST /api/ai/tailor` — Analyze resume against job
8. **`get_interview_questions`** → `POST /api/ai/questions` — Generate interview prep
9. **`find_matching_jobs`** → `POST /api/ai/cv-match` — Find jobs matching resume

### Design Principle

WebMCP tools act as a **bridge layer** — they expose the same actions available to human users through the UI to AI agents via structured tool calls. No backend logic was duplicated; tools simply invoke existing API endpoints using the user's authenticated browser session.

### Verification

- All tools gracefully degrade: if `document.modelContext` is not available (standard browser without WebMCP), no errors occur
- Existing modules remain completely unchanged
- Zero new npm dependencies added
- Zero database schema changes
