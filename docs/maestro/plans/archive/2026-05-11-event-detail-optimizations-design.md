---
title: "Event Detail Page Optimizations"
created: "2026-05-11T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Event Detail Page Optimizations Design Document

## Problem Statement

The recently restructured Event Detail page exhibits several functional and visual regressions identified during code review. Specifically, the "Có thể bạn cũng thích" (Recommendations) section is entirely decoupled from the API, relying on hardcoded mock data. Visually, the page suffers from excessive vertical "empty space" caused by additive nested margins and paddings. Furthermore, the intended glassmorphic design is partially broken because Tailwind CSS variables (like `--tr-surface`) are missing from the global stylesheet, and existing variables lack the `/<alpha-value>` placeholder required for opacity modifiers (e.g., `bg-background/30`). Finally, the data fetching logic is fragile, causing a complete page crash if secondary endpoints like the seat map fail.

## Requirements

### Functional Requirements

1. **REQ-1**: `RecommendationsSection` must receive and display real data from the API (via the `useEventDetail` hook).
2. **REQ-2**: The `useEventDetail` hook must fetch similar events (by category) to populate the recommendations.
3. **REQ-3**: The fetching logic must be resilient, using `Promise.allSettled` to ensure the page renders even if the seat map or similar events fail to load.
4. **REQ-4**: `OrganizerSection` must replace hardcoded mock fallbacks with proper loading/missing states from the `event` object.
5. **REQ-5**: The `IntersectionObserver` in `EventDetail.jsx` must use a `0.1` threshold to prevent sticky bar flickering.

### Non-Functional Requirements

1. **REQ-N1**: Tailwind alpha support: update `tailwind.config.js` to support opacity modifiers for all HSL-based colors.
2. **REQ-N2**: Spacing: reduce compounded vertical spacing (margins/paddings) to eliminate "dead space".
3. **REQ-N3**: Visual Clarity: restore glassmorphic depth by defining missing CSS variables and increasing border contrast in components.

### Constraints

- **CON-1**: Adhere strictly to the existing design system tokens.
- **CON-2**: Use existing `eventService` methods; extend them only if necessary for fetching similar events.

## Approach

### Selected Approach

**Targeted Configuration and Logic Fixes**

We will implement a series of precise fixes across the config, hook, and components layers.

- **Theme Engine Restoration** — *[Adding `--tr-surface` to `index.css` and `/<alpha-value>` to `tailwind.config.js` restores the intended design system functionality, satisfying REQ-N1 and REQ-N3]* (Traces To: REQ-N1, REQ-N3) *(considered: inline hex colors — rejected because it creates technical debt and breaks theming)*.
- **Resilient Data Orchestration** — *[Moving to `Promise.allSettled` in `useEventDetail.js` ensures high availability of the main event view even when sub-resources fail, satisfying REQ-3]* (Traces To: REQ-2, REQ-3) *(considered: sequential awaits — rejected because it increases TTI (Time to Interactive))*.
- **Spacing De-compounding** — *[Reducing global and section-level `space-y-12` and `py-20` to more conservative values (e.g., `space-y-8`, `py-10`) eliminates the user's reported "empty space" issue, satisfying REQ-N2]* (Traces To: REQ-N2).
- **Component Data Wiring** — *[Replacing mock placeholders with props and conditional logic in `RecommendationsSection`, `OrganizerSection`, and `ScheduleSection` brings the UI into alignment with real system state, satisfying REQ-1 and REQ-4]* (Traces To: REQ-1, REQ-4).

### Alternatives Considered

#### Rollback to Monolithic Page
- **Description**: Undo the componentization.
- **Pros**: None.
- **Cons**: Does not solve CSS or fetching issues; worsens maintainability.
- **Rejected Because**: The component structure is correct; the integration and styling just need polish.

### Decision Matrix

| Criterion | Weight | Targeted Fixes | Minimal Patching |
|-----------|--------|----------------|------------------|
| UX/Visual Integrity | 40% | 5: Restores design system | 3: Fixes logic but leaves styling broken |
| Resilience (REQ-3) | 30% | 5: Full async protection | 1: Page still crashes on error |
| Dev Speed | 30% | 4: Slight overhead for config | 5: Fast logic-only fixes |
| **Weighted Total** | | **4.7** | **3.0** |

## Architecture

### Component Updates

```text
Global Config
├── index.css (Add --tr-surface variable)
└── tailwind.config.js (Update HSL alpha placeholders)

Page Logic
├── eventService.js (New method: getSimilarEvents)
└── useEventDetail.js (Resilient Promise.allSettled orchestration)

UI Assembly (EventDetail.jsx)
├── Spacing reduction (compounded margins removed)
├── Props wiring (data -> RecommendationsSection)
└── Trigger tuning (IntersectionObserver threshold: 0.1)

Modular Components
├── IntroductionSection (Increased border contrast)
├── ScheduleSection (Dynamic min-height)
└── OrganizerSection (Removed hardcoded mock data)
```

### Data Flow Rationale

1. **Config Layer**: Restoration of `--tr-surface` and alpha support is global, ensuring consistency across all glassmorphic components — *[Satisfies REQ-N1]* (Traces To: REQ-N1).
2. **Hook Layer**: `useEventDetail` now acts as a resilient buffer. By using `Promise.allSettled`, it protects the primary UI (Event Title/Hero) from secondary API failures (Recommendations/SeatMap) — *[Satisfies REQ-3]* (Traces To: REQ-3).
3. **Integration Layer**: `EventDetail.jsx` passes state down. The `recommendedEvents` are no longer hidden inside the child but are explicitly owned by the page logic — *[Satisfies REQ-1]* (Traces To: REQ-1).

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Config and Logic Foundations (`index.css`, `tailwind.config.js`, `eventService.js`, `useEventDetail.js`) |
| 2     | coder    | No       | Component Polish and Wiring (`EventDetail.jsx` and sub-components) |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Visual regressions on other pages from config changes | MEDIUM | LOW | Limit HSL variable updates to only those used in the detail page and follow standard Tailwind patterns. |
| API data for similar events is sparse | LOW | HIGH | Implement a clean "Empty" state or fallback to "Trending" events if "Similar" returns 0 results. |

## Success Criteria

1. **SC-1**: `RecommendationsSection` displays real event cards fetching data through the hook.
2. **SC-2**: Glassmorphic boxes have visible borders (`white/15`) and proper depth via functioning opacity modifiers.
3. **SC-3**: Vertical gaps between sections are visually tight and consistent.
4. **SC-4**: Page remains functional if the seat map API returns a 500 error.
