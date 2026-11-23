# LabShare AI — GenAI-Powered Campus Laboratory Resource-Sharing Platform

**Live Demo:** [https://vercel.app](https://vercel.app)

A full-stack Next.js 14 platform enabling students to discover equipment across CS, Electronics, and Mechanical departments, manage project-based bookings, handle faculty approvals, and resolve scheduling conflicts via Google Gemini with an offline fallback engine.

---

## Quick Start & Verification

```bash
npm install
npm run setup    # Creates SQLite schema and seeds 12 lab items + 2 active conflicts
npm run dev      # Starts local server at http://localhost:3000
npm test         # Runs Vitest unit, component, security, and workflow test suites
npm run lint     # Runs ESLint and strict TypeScript quality checks
npm run build    # Runs production build and database verification
```

---

## Core Features & Architecture

- **Equipment Discovery & Project Bookings:** Debounced search, department filters, and live status (`AVAILABLE`, `IN_USE`, `MAINTENANCE`) paired with a Zod-validated booking drawer.
- **Role-Based Approvals & GenAI Conflict Resolution:** Role switcher (`Student`, `Faculty Advisor`, `Lab Admin`), Gemini 1.5 Flash scheduling arbitration, and a deterministic fallback engine.
- **Resource Utilization Analytics:** Real-time KPI summaries and department utilization metrics.
- **Modular Architecture:** Indexed SQLite via Prisma (`prisma/`), pure domain logic (`src/lib/`), service layer (`src/services/`), validated routes (`src/app/api/`), and accessible UI components (`src/components/`).

---

## Security & Demo Identity Controls

- **Role Allowlisting & Rate Limiting:** Enforces `requireRole()` and bounded sliding-window rate limits (`429 Too Many Requests`).
- **Request & AI Output Validation:** Zod schemas validate payloads and cross-check Gemini outputs before database mutations.
- **Duplicate Submission & Transaction Safety:** Blocks duplicate student bookings (`409 Conflict`) and enforces atomic transactions.
- **Sanitized Errors & HTTP Headers:** Strips internal database details and configures security headers (`CSP`, `HSTS`, `X-Frame-Options`, `nosniff`) in `next.config.mjs`.

---

## Accessibility & Automated Testing

- **Accessibility (WCAG 2.1 AA):** Semantic HTML landmarks, label bindings, live status announcements, and keyboard-accessible modals.
- **Automated Test Suite (`npm test`):** Covers faculty approvals, rescheduling collision checks, Gemini timeout fallbacks, maintenance status rejections, database rollbacks, and role-based API security (`401`/`403`/`429`).
