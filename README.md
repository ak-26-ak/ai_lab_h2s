# LabShare AI — GenAI-Powered Campus Laboratory Resource-Sharing Platform

**Live Demo:** [https://ai-lab-h2s.vercel.app/](https://ai-lab-h2s.vercel.app/)

A full-stack Next.js 14 platform enabling students to discover specialized equipment across CS, Electronics, and Mechanical departments, submit booking requests, manage faculty approvals, and resolve scheduling conflicts via Google Gemini (with an offline fallback engine).

## Core Capabilities

- **Cross-Department Equipment Discovery:** Catalog search with department filtering and real-time status tracking (`AVAILABLE`, `IN_USE`, `MAINTENANCE`).
- **Project-Based Access Requests:** Slide-over booking drawer with Zod validation.
- **Role-Based Workflow & Faculty Approvals:** Instant campus role switcher (`Student`, `Faculty Advisor`, `Lab Admin`) with server-side role enforcement.
- **GenAI Conflict Resolution Studio:** Detects overlapping resource requests, evaluates deadlines via Gemini 1.5 Flash, and provides automated resolution actions.
- **Resource Utilization Analytics:** Real-time KPI summaries and department metrics.
- **Pre-Seeded Dataset:** Includes 12 laboratory resources and 2 active scheduling conflicts.

## Architecture

The project is structured with a Prisma/SQLite backend, Next.js 14 API routes, semantic React components, domain-logic libraries (`src/lib`), and a Vitest automated test suite.

## Local Setup

```bash
npm install
npm run setup    # Seeds database
npm run dev      # Starts server at http://localhost:3000
npm test         # Run automated tests
```
