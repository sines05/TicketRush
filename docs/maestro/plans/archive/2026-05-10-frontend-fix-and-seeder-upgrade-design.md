---
title: "Frontend Fixes and Seeder Upgrade"
created: "2026-05-10T17:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Frontend Fixes and Seeder Upgrade Design Document

## Problem Statement

Following the recent frontend "Perfection Upgrade", several components were hardcoded with `text-white` classes. While this looked good in dark mode, it causes text to disappear against the off-white background when the application is in light mode. Additionally, the current database seeder (`cmd/seed/main.go`) only generates 8 events, which is insufficient to rigorously test horizontal scrolling performance, pagination, and diverse search filtering scenarios.

## Requirements

### Functional Requirements
1. **REQ-1 (Theme-Aware Text)**: Remove hardcoded `text-white` classes from primary text elements in all recently upgraded components (`SpecialEvents.jsx`, `TrendingEvents.jsx`, `EventCard.jsx`, `LocationCards.jsx`, `EventListWithTabs.jsx`).
2. **REQ-2 (Seeder Volume)**: Update the database seeder to generate a significantly larger volume of mock data (50+ events).
3. **REQ-3 (Seeder Variety)**: Ensure the generated seeds cover all available categories and locations randomly to provide realistic search testing scenarios.

### Non-Functional Requirements
1. **REQ-4 (Accessibility)**: Text contrast ratios must remain compliant in both light and dark modes.
2. **REQ-5 (Maintainability)**: Frontend color classes should rely on CSS variables defined in `index.css` (e.g., `text-foreground`, `text-primary-foreground`) rather than hardcoded hex or Tailwind default colors where appropriate.

### Constraints
- The seeder must remain idempotent (or wipe the DB first) so developers can run it multiple times safely.

## Approach

### Selected Approach: Utility Class Replacement & Loop-Based Seeding

**Frontend:** We will perform a surgical search-and-replace across the specified components, changing `text-white` to `text-foreground` for text that sits on the main background, and keeping `text-white` only where it sits on top of a dark image overlay (e.g., the Hero Carousel images). 

**Backend:** We will refactor `cmd/seed/main.go` to extract the event creation logic into a loop. We will create arrays of sample titles, descriptions, and banner URLs, and randomly select from these arrays, along with the `CATEGORY_OPTIONS` and `CITY_OPTIONS` from the frontend logic, to create 50 unique events.

### Alternatives Considered

#### Dynamic CSS Variables per Component
- **Description**: Defining component-specific CSS variables for text colors depending on the active theme.
- **Pros**: Ultimate flexibility.
- **Cons**: Over-engineers a simple problem. Tailwind's `text-foreground` already handles light/dark mode switching based on the root `.dark` class.
- **Rejected Because**: Unnecessary complexity. Leveraging existing Tailwind theme variables is more maintainable.

### Decision Matrix

| Criterion | Weight | Utility Replacement (Selected) | Component CSS Variables |
|-----------|--------|--------------------------------|-------------------------|
| Speed of Implementation | 40% | 5: Direct string replacement in JSX. | 2: Requires updating CSS files and JSX. |
| Maintainability (REQ-5) | 40% | 5: Relies on global theme variables. | 3: Scatters theme logic. |
| Accessibility (REQ-4) | 20% | 4: Safe, assuming `foreground` contrasts well with `background`. | 5: Granular control. |
| **Weighted Total** | | **4.8** | **3.0** |

## Architecture

### Component Updates
<!-- Rationale: Replacing text-white with text-foreground ensures readability in light mode while preserving dark mode aesthetics. -->
- **`SpecialEvents.jsx`, `EventListWithTabs.jsx`, `LocationCards.jsx`**: Change section headers (`<h2 className="... text-white">`) to `text-foreground`.
- **`TrendingEvents.jsx`**: Change section header and ensure the title overlay logic handles contrast. If text is over an image with a dark gradient, `text-white` might be correct, but we must verify the background.

### Seeder Architecture
<!-- Rationale: A loop-based seeder with randomized properties ensures robust, varied data for testing pagination and search filters. -->
- **Data Arrays**: Define arrays of mock titles, descriptions, and banner URLs.
- **Randomization Logic**: Use `math/rand` to pick random categories, locations (from a predefined slice matching frontend constants), and dates (ranging from -30 days to +60 days).
- **Batch Processing**: Loop 50 times to generate `models.Event` structs and insert them.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Update JSX files to fix text visibility bugs. |
| 2     | `data_engineer`  | No       | Refactor `cmd/seed/main.go` to generate 50+ diverse events. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Contrast Loss over Images | HIGH | MEDIUM | We must carefully review if `text-white` was being used over a dynamically loaded image (like a banner). If so, we must ensure a CSS gradient overlay is present, or keep `text-white`. We will only change `text-white` to `text-foreground` for text sitting on the main app background. |
| Seeder Execution Time | LOW | LOW | Seeding 50 events is fast for Postgres, but generating thousands of seats might be slow. We will keep the zone/seat counts reasonable (e.g., 2 zones with 10-20 seats each) per event. |

## Success Criteria

1. **Light Mode Verification**: Switching the application to light mode allows all section titles (Special Events, Trending, Locations, Category Tabs) to be fully readable (dark text on light background).
2. **Seeder Verification**: Running `go run cmd/seed/main.go` successfully populates the database with at least 50 events.
3. **Data Variety**: The seeded events cover multiple categories (Music, Sports, etc.) and locations (HCM, Hanoi, Dalat, etc.).
