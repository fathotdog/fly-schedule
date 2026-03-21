# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A school timetable scheduling system for Taiwanese schools. UI and data are in Traditional Chinese. The system manages semesters, classes, teachers, courses, and generates conflict-free timetable slots with PDF/Excel export.

## Development Commands

### Start Both Servers
```bash
start.bat   # Launches API (port 5041) and frontend (port 5173) in separate windows
```

### Backend (from `src/Schedule.Api/`)
```bash
dotnet run          # Start API server on http://localhost:5041
dotnet test         # Run tests (from /tests/Schedule.Api.Tests/)
```

### Frontend (from `src/schedule-web/`)
```bash
npm run dev         # Vite dev server on http://localhost:5173
npm run build       # TypeScript check + production build
npm run lint        # ESLint
```

## Architecture

### Backend — ASP.NET Core 10 Minimal API + EF Core + SQLite

- **Entry**: `src/Schedule.Api/Program.cs` — registers services and maps endpoint groups
- **Endpoints**: `src/Schedule.Api/Endpoints/` — Minimal API route handlers (no MVC controllers)
- **Services**: `ConflictDetectionService`, `TimetableService`, `TimetablePdfService`, `ExcelService`
- **Data**: `src/Schedule.Api/Data/ScheduleDbContext.cs` — EF Core with SQLite (WAL mode enabled)
- **Seeded data**: 10 default courses (國文, 英語, etc.) + 3 staff titles (StaffTitle)

**Conflict Detection**: The API returns HTTP 409 with conflict details when a timetable slot violates uniqueness constraints. `ConflictDetectionService` handles dry-run checks and full validation.

### Frontend — React 19 + TypeScript + Vite + Tailwind CSS 4

- **Entry**: `src/schedule-web/src/main.tsx`
- **API Client**: `src/schedule-web/src/api/client.ts` — Axios-based, typed, proxied to `/api` → `http://localhost:5041`
- **Global State**: `src/schedule-web/src/store/useScheduleStore.ts` — Zustand store for UI state (selected semester, active tab, etc.)
- **Server State**: TanStack React Query (30s stale time) for all API data
- **Routing**: React Router DOM for tab navigation
- **Path Alias**: `@/` maps to `src/`

### Data Model (Semester-Scoped)

All scheduling data is scoped to a **Semester** (AcademicYear + Term). Key entities:
- `SchoolClass` → Grade + Section (e.g., "9-A")
- `Teacher` → Has `MaxWeeklyPeriods` capacity
- `CourseAssignment` → Links Semester + Course + Teacher + SchoolClass + WeeklyPeriods quota
- `TimetableSlot` → CourseAssignmentId + DayOfWeek + PeriodId (unique constraint enforced in DB and service layer)
- `HomeroomAssignment` → Homeroom teacher per class (1:1)
- `RoomBooking` → Special room reservations (1:1 with TimetableSlot)

One course + class can have **multiple teachers** (split teaching supported), but no duplicate teacher-course-class combinations.

### API Proxy

Vite dev proxy: requests to `/api/*` → `http://localhost:5041`. In production, configure reverse proxy accordingly.

## Design System

The UI follows an "Academic Architect" design philosophy documented in `gunze-130th-design-system.md`:
- **Colors**: Material Design 3 tokens — primary blue `#002c98`, tertiary `#00413c`
- **Typography**: Manrope (headlines), Inter (body, 0.875rem base)
- **Style**: Surface-based depth layering, no hard borders, no divider lines — use tonal depth instead
- **Components**: Glassmorphic drag-cards; dropdowns should avoid `position: relative` wrappers to prevent bleed-through

Screen mockups and code samples are in `docs/stitch/`.

## Testing

Backend uses XUnit with in-memory EF Core. Run from repo root:
```bash
dotnet test tests/Schedule.Api.Tests/
```

To run a single test:
```bash
dotnet test tests/Schedule.Api.Tests/ --filter "FullyQualifiedName~TestMethodName"
```
