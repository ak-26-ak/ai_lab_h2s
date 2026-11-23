# LabShare AI — GenAI-Powered Campus Laboratory Resource-Sharing Platform

**Live Demo:** [https://vercel.app](https://vercel.app)

A Next.js 14 full-stack MVP for campus laboratory resource sharing, featuring equipment discovery, booking management, and AI-powered conflict resolution.

---

## Quick Start & Verification

```bash
npm install
npm run setup    # Creates SQLite schema and seeds lab items and conflicts
npm run dev      # Starts local server at http://localhost:3000
npm test         # Runs Vitest unit, component, and security test suites
npm run lint     # Runs ESLint and TypeScript quality checks
npm run build    # Runs production build and database verification
```

---

## Core Features & Architecture

- **Equipment Discovery & Bookings:** Real-time search, department filtering, and booking requests.
- **Role-Based Approvals & AI Conflict Resolution:** Role switching (`Student`, `Faculty Advisor`, `Lab Admin`) and Gemini-powered scheduling arbitration.
- **Tech Stack:** Next.js 14 (App Router), Prisma, SQLite, Zod validation, Vitest, and Tailwind CSS.

---

## Security & Demo Controls

- **Server-Side Role Allowlisting & Rate Limiting:** Enforces strict role checks and sliding-window rate limiting on mutations.
- **Validation & Duplicate Protection:** Uses Zod schemas and prevents overlapping booking submissions for identical time windows.
- **Error Handling & Secret Hygiene:** Sanitizes error responses and restricts `GEMINI_API_KEY` to server-side execution.

---

## Accessibility & Testing

Includes WCAG 2.1 AA accessibility features (semantic HTML, ARIA attributes, keyboard navigation) and comprehensive automated test suites covering security and conflict logic.
