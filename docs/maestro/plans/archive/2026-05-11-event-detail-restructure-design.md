---
title: "Event Detail Page Restructure"
created: "2026-05-11T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Event Detail Page Restructure Design Document

## Problem Statement

The current Event Detail page is a monolithic component lacking the detailed visual structure requested in the reference design. It needs to be restructured to improve user experience, visually separating the Hero (ticket info and poster), Introduction, Schedule (with a toggleable Calendar/List view), Organizer, and Recommendations. Additionally, a Sticky Action Bar needs to be implemented to keep the primary CTA ("Mua vé ngay") accessible during scrolling. All visual changes must strictly map to the existing TicketRush design tokens (e.g., `brand-600`, `bg-surface`) to maintain brand consistency, rather than hardcoding the reference colors.

## Requirements

### Functional Requirements

1. **REQ-1**: Implement a 2-column Hero section displaying event details on the left and the poster on the right.
2. **REQ-2**: Implement an Introduction section to display rich text descriptions.
3. **REQ-3**: Implement a Schedule section that toggles between a List view and a Calendar view (using `react-day-picker` and `date-fns`).
4. **REQ-4**: Implement a Sticky Action Bar that appears (using `IntersectionObserver`) only after scrolling past the Hero section.
5. **REQ-5**: Display an Organizer info section.
6. **REQ-6**: Display a Recommendations/Related Products grid at the bottom.

### Non-Functional Requirements

1. **REQ-N1**: Performance: The Sticky Bar implementation must not cause scroll jank (leverage IntersectionObserver over scroll event listeners).
2. **REQ-N2**: Maintainability: The page must be componentized, separating UI components from the main page logic, and state/fetching must be extracted into a custom hook (`useEventDetail`).

### Constraints

- **CON-1**: Strict adherence to the existing TicketRush Tailwind theme and design tokens (e.g., `brand-600` for highlights instead of literal reference colors).
- **CON-2**: Must utilize existing backend APIs for event data, seat maps, and reviews without requiring backend schema changes.

## Approach

### Selected Approach

**Componentized Architecture with Custom Hook**

We will separate the page into distinct UI components (`HeroSection`, `ScheduleSection`, `StickyActionBar`, etc.) and abstract the data fetching and complex state management into a custom hook (`useEventDetail`).
- **Data & State Management** — *[Extracting logic to `useEventDetail` ensures UI components remain pure and testable, satisfying REQ-N2]* (Traces To: REQ-N2) *(considered: Inline state in page component — rejected because it leads to a monolithic, hard-to-maintain file)*.
- **Sticky Header Trigger** — *[Using IntersectionObserver avoids the performance overhead of continuous window scroll events, satisfying REQ-N1]* (Traces To: REQ-N1, REQ-4) *(considered: Global scroll listener — rejected because of scroll jank risks; Pure CSS — rejected because it cannot conditionally hide the bar while still over the Hero section)*.
- **Calendar Implementation** — *[Leveraging the existing `react-day-picker` and `date-fns` dependencies provides a robust accessible calendar while allowing deep Tailwind styling to match the visual requirements]* (Traces To: REQ-3) *(considered: Custom DOM calendar — rejected because it reinvents the wheel and risks accessibility issues)*.
- **Color Mapping** — *[Mapping reference colors to `brand-600` and `surface` tokens maintains brand consistency, satisfying CON-1]* (Traces To: CON-1) *(considered: Extending Tailwind theme — rejected because it dilutes the existing design system)*.

### Alternatives Considered

#### Monolithic Page
- **Description**: Keep everything in `EventDetail.jsx`.
- **Pros**: Fast initially.
- **Cons**: Unmanageable file size, hard to test UI in isolation.
- **Rejected Because**: It violates maintainability goals (REQ-N2) as the file would grow too large with the new complex sections.

#### Componentized without Hook
- **Description**: Split UI but keep fetching in the main page.
- **Pros**: Better organization.
- **Cons**: Main page still carries too much orchestration burden.
- **Rejected Because**: State management remains messy.

### Decision Matrix

| Criterion | Weight | Monolithic | Componentized | Componentized + Hook |
|-----------|--------|------------|---------------|----------------------|
| Maintainability (REQ-N2) | 40% | 1: Unmanageable file size | 3: Better, but state is messy | 5: Clean separation of UI and logic |
| Dev Speed | 30% | 4: Fast initially | 3: Requires some wiring | 2: Most upfront boilerplate |
| Testability | 30% | 1: Hard to test UI in isolation | 3: UI is testable | 5: Logic and UI testable separately |
| **Weighted Total** | | **1.9** | **3.0** | **4.1** |

## Architecture

### Component Diagram

```text
EventDetail (Page Component)
├── useEventDetail (Custom Hook: Data & State)
├── IntersectionObserver (Tracks Hero visibility)
├── StickyActionBar (Displays when Hero is hidden)
├── HeroSection (Left: Details, Right: Poster)
├── IntroductionSection (Rich text)
├── ScheduleSection
│   └── Toggle (List/Calendar)
│   └── CalendarView (react-day-picker)
├── OrganizerSection (Logo & Info)
└── RecommendationsSection (Event Cards)
```

### Data Flow

1. `EventDetail` mounts and extracts the `slug` from the URL.
2. `useEventDetail` hook invokes `eventService.getEventDetail` and `eventService.getSeatMap`.
3. Loading state is managed internally by the hook. Once data is ready, it is passed down as props to the respective child components (`HeroSection`, `ScheduleSection`, etc.).
4. `IntersectionObserver` attached to a ref on the `HeroSection` manages a boolean state (`isStickyVisible`), which conditionally renders or animates the `StickyActionBar`.
5. Toggle state in the `ScheduleSection` switches rendering between list and calendar modes.

### Key Interfaces

```typescript
interface UseEventDetailReturn {
  event: Event | null;
  seatMap: SeatMap | null;
  loading: boolean;
  error: string;
  minPrice: number | null;
}

interface HeroSectionProps {
  event: Event;
  minPrice: number | null;
  heroRef: React.RefObject<HTMLDivElement>;
}

interface StickyActionBarProps {
  event: Event;
  isVisible: boolean;
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Implement the custom hook, individual UI components, and restructure `EventDetail.jsx`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| IntersectionObserver performance issues on mobile | MEDIUM | LOW | Use standard React `useEffect` cleanup and avoid heavy layout thrashing in the callback. |
| Calendar component styling conflicts | LOW | MEDIUM | Scope Tailwind classes tightly to the `react-day-picker` wrapper to avoid bleeding into global styles. |

## Success Criteria

1. The new `EventDetail` page renders successfully with all required sections (Hero, Introduction, Schedule, Organizer, Recommendations).
2. The `StickyActionBar` appears only after the Hero section is scrolled out of view.
3. The Calendar view correctly displays dates and integrates with existing theme colors.
4. No backend API modifications were required.
