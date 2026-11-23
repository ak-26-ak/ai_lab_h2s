# LabShare AI - Campus Laboratory Resource-Sharing Platform

A Next.js 14 (App Router) MVP that lets students discover lab equipment across CS, Electronics and Mechanical departments, request time slots for projects, lets faculty approve or reject requests, and uses GenAI (Google Gemini, with a deterministic fallback) to resolve scheduling conflicts.

## Quick start

    npm install
    npm run setup      # creates SQLite schema and seeds 12 items + 2 conflicts
    npm run dev        # http://localhost:3000

Other scripts: npm test, npm run lint, npm run build.

The .env file is generated for you. Add GEMINI_API_KEY to enable Gemini. Without it (for example during automated grading) the rules-based fallback engine is used, so every feature works offline.

## Features

- Equipment discovery with debounced search and department filter, live availability (Available / In Use / Maintenance).
- Slide-over booking drawer: project title, description, deadline, time slot, inline Zod validation (same schema on client and server).
- Approvals tab: Faculty Advisor and Lab Admin roles approve or reject. Approval is blocked when a slot overlaps an already approved booking.
- AI Conflict Studio: side-by-side requests with deadline urgency badges, an AI recommendation card (reasoning, reassignment or new slot) and one-click Apply Resolution.
- Analytics: utilization by department, most-booked equipment, fleet status and the header KPI cards.
- Seed data: 12 equipment items, 2 pending conflicts (RTX 4090 workstation, UR5e robot arm) and sample approved bookings.

## Architecture

    prisma/            schema.prisma (indexes on equipmentId, startTime, status) and seed.ts
    src/lib/           pure logic: conflicts.ts, resolution.ts (fallback + AI parsing), schemas.ts (Zod), http.ts, utils.ts
    src/services/      data access and business logic: equipment, booking, conflict, analytics, ai
    src/app/api/       thin route handlers: validate with Zod, call a service, return JSON
    src/components/    UI: Header, EquipmentGrid, BookingModal, Approvals, ConflictStudio, Analytics, ui primitives
    tests/             Vitest + React Testing Library

### GenAI flow

1. conflictService finds overlapping active bookings (lib/conflicts.ts).
2. aiService sends both requests and free same-category equipment to Gemini with responseMimeType application/json.
3. The response is parsed and validated with Zod, then cross-checked against real data (winner must be one of the two, proposed equipment or slot must be free). Anything invalid, or any API error or missing key, falls back to the deterministic engine: approved bookings are never bumped, the earlier deadline wins, and the loser is reassigned to free equivalent equipment or rescheduled right after the winner.

## Security

- All API inputs validated with Zod; Prisma parameterises queries.
- GEMINI_API_KEY is read only in server code (aiService) and never exposed to the client.
- .env and *.db are git-ignored. HTTP security headers (CSP, X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy) are set in next.config.mjs.
- Approve, reject and apply endpoints require an x-role header of FACULTY or ADMIN. This is a demo-grade role gate driven by the Role Switcher; production should use real authentication (for example NextAuth) and derive the role from the session.

## Efficiency

- No N+1: equipment availability uses a filtered include; conflict listing uses two queries total; analytics uses two queries.
- Indexes on Booking.equipmentId, Booking.startTime and Booking.status.
- Search input is debounced by 300 ms.

## Accessibility (WCAG 2.1 AA)

Semantic landmarks (header, nav, main, section), skip link, labelled inputs, aria-labels on icon buttons, aria-pressed on toggles, role=alert for errors, role=status live region for toasts, modal with focus trap, Escape to close and focus restoration, high-contrast colours, reduced-motion support.

## Testing

    npm test

Covers conflict detection, approval logic, AI response parsing, the fallback engine, AI output validation, and the booking modal (validation, labels, Escape).

## Deploy / push

    git init && git add . && git commit -m "Initial commit" && git branch -M main
    git remote add origin <your-repo-url> && git push -u origin main
