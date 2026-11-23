# LabShare AI — GenAI-Powered Campus Laboratory Resource-Sharing Platform

**Live Demo:** [https://vercel.app](https://vercel.app)

A full-stack Next.js 14 platform enabling students to discover equipment across academic departments, manage project-based booking requests, handle faculty approvals, and resolve scheduling conflicts via Google Gemini or an offline fallback engine.

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

- **Cross-Department Equipment Discovery:** Debounced catalog search (300ms) with department filtering (`CS`, `Electronics`, `Mechanical`) and live availability status (`AVAILABLE`, `IN_USE`, `MAINTENANCE`).
- **Project-Based Access Requests:** Accessible slide-over booking drawer with shared client/server Zod schema validation.
- **Role-Based Approvals & GenAI Conflict Resolution:** Role switcher (`Student`, `Faculty Advisor`, `Lab Admin`) paired with Gemini 1.5 Flash structured JSON arbitration and a deterministic rules-based fallback engine.
- **Utilization Analytics:** Real-time KPI summaries, department utilization rates, and fleet status metrics.
- **Layered Architecture:** Indexed SQLite via Prisma, pure scheduling logic in `src/lib/`, business logic in `src/services/`, validated route handlers in `src/app/api/`, and WCAG 2.1 AA compliant UI components in `src/components/`.

---

## Security & Demo Identity Controls

- **Strict Server-Side Role Allowlisting:** Enforces `requireRole()` against canonical role enums (`STUDENT`, `FACULTY`, `ADMIN`).
- **Bounded Sliding-Window Rate Limiting:** Throttles sensitive endpoints (`429 Too Many Requests`) with automatic bucket pruning (`MAX_BUCKETS = 500`).
- **API Request & AI Output Validation:** Zod schemas validate payloads and cross-check Gemini responses before database writes.
- **Duplicate Booking Submission Protection:** Prevents repeated overlapping bookings by the same student for identical equipment (`409 Conflict`).
- **Sanitized Error Handling & HTTP Headers:** Strips internal database details and includes standard security headers (`CSP`, `HSTS`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) in `next.config.mjs`.

---

## Accessibility & Automated Testing

- **Accessibility (WCAG 2.1 AA):** Semantic HTML landmarks, explicit label bindings, live status announcements, and keyboard-navigable modals.
- **Automated Test Suite (`npm test`):** Covers race-condition prevention, conflict rescheduling, Gemini timeout fallbacks, maintenance status rejections, duplicate booking guards, and role-based API security (`401`/`403`/`429`).
