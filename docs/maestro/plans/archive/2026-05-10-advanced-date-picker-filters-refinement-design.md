---
title: "Advanced Date Picker & Filters Refinement"
created: "2026-05-10T16:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Advanced Date Picker & Filters Refinement Design Document

## Problem Statement
The Search Results page currently has a static Top Bar with placeholder buttons for filtering. To provide a high-end user experience, we need to implement a fully functional, URL-driven filtering system. The core feature is an advanced Dual Calendar Date Picker with quick selection options. Additionally, we need to integrate comprehensive filters for Price, Category, and Location into a unified interface to refine search results efficiently.

## Requirements

### Functional Requirements
1. **REQ-1 (Date Picker UI)**: Implement a dual-calendar view (two consecutive months) accessible from the "Tất cả các ngày" button.
2. **REQ-2 (Date Quick Selections)**: Include a top bar in the date picker with options: "Tất cả các ngày" (default, highlighted green), "Hôm nay", "Ngày mai", "Cuối tuần này", "Tháng này".
3. **REQ-3 (Date Picker Interactions)**: Include navigation arrows, short weekday labels, highlight the current/selected date, blur out-of-month dates, and provide a footer with "Thiết lập lại" (Reset) and dynamic "Áp dụng" (Apply) buttons.
4. **REQ-4 (Advanced Filters Modal)**: Implement a Slide-out Sheet or Modal accessible via the green "Bộ lọc" button containing filters for Price (range slider/inputs) and Category (checkboxes/pills).
5. **REQ-5 (Location Filter)**: Enhance the "Vị trí khác" button to allow selecting specific cities, Nationwide ("Toàn quốc"), or "Other".
6. **REQ-6 (URL Synchronization)**: All filter states (dates, price, category, location) must sync with the URL query parameters to support shareable links and trigger backend searches.

### Non-Functional Requirements
1. **REQ-7 (Library Integration)**: Utilize `react-day-picker` and `date-fns` for robust, accessible calendar logic, styled via Tailwind CSS to match the design system.

### Constraints
- Must integrate cleanly with the existing `SearchResults.jsx` layout and `eventService` filtering parameters.

## Approach

### Selected Approach
**Component Composition with URL State**

We will install `react-day-picker`, `date-fns`, and necessary Radix UI primitives (Popover for the date dropdown, Sheet/Dialog for the advanced filters). 
The `SearchResults` component will act as the orchestrator. We will create two main new components:
1. `DatePickerDropdown`: A Popover containing the `react-day-picker` customized for dual months, plus custom headers (Quick Selections) and footers (Apply/Reset).
2. `AdvancedFiltersSheet`: A side-panel containing price ranges and category selections.

### Alternatives Considered
#### Custom Calendar Implementation
- **Description**: Building the calendar logic (days in month, leap years, week start) from scratch using native JavaScript `Date`.
- **Pros**: Zero added dependencies.
- **Cons**: Highly prone to edge-case bugs (timezones, leap years), requires significant effort for accessibility (keyboard navigation), reinventing the wheel.
- **Rejected Because**: The complexity of a dual-calendar with robust UX far outweighs the minimal cost of adding industry-standard libraries like `react-day-picker`.

### Decision Matrix

| Criterion | Weight | Library (react-day-picker) | Custom Implementation |
|-----------|--------|----------------------------|-----------------------|
| Reliability & Edge Cases | 40% | 5: Battle-tested library handles calendar edge cases. | 2: High risk of subtle date math bugs. |
| Development Velocity | 30% | 5: Allows focus on styling and custom requirements (quick selects). | 2: Significant time spent on core calendar logic. |
| Accessibility | 30% | 5: Built-in ARIA support and keyboard navigation. | 1: Difficult to implement correctly from scratch. |
| **Weighted Total** | | **5.0** | **1.7** |

## Architecture

### Component Diagram
```
SearchResults
├── TopBar
│   ├── Title
│   ├── DatePickerDropdown (Uses Popover + react-day-picker)
│   │   ├── QuickSelectionBar
│   │   ├── DualMonthCalendar (react-day-picker, numberOfMonths={2})
│   │   └── ActionFooter (Reset / Apply)
│   ├── AdvancedFiltersSheet (Uses Sheet/Dialog)
│   │   ├── PriceFilter (Slider/Inputs)
│   │   └── CategoryFilter (Checkboxes)
│   └── LocationDropdown (Uses Popover/Select)
│       └── CityList + "Other" + "Nationwide"
└── GridContainer
    └── SearchResultCard
```

### Data Flow
1. User opens `DatePickerDropdown`. Local state tracks the *tentative* selection.
2. User clicks Quick Selection (e.g., "Cuối tuần này") or manually selects dates on the calendar. Local state updates; the "Áp dụng" (Apply) button becomes enabled/green.
3. User clicks "Áp dụng". The component updates the URL search parameters (`?dateFrom=...&dateTo=...`).
4. `SearchResults` component detects URL change and triggers `eventService.getEvents` with the new parameters.
5. The same pattern applies to `AdvancedFiltersSheet` and `LocationDropdown`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Install dependencies (`react-day-picker`, `date-fns`, Radix primitives). Create and integrate the `DatePickerDropdown`, `AdvancedFiltersSheet`, and `LocationDropdown` components into `SearchResults.jsx`. Update backend repository if needed to support `dateFrom` and `dateTo`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Mobile Calendar Display | MEDIUM | HIGH | A dual-month calendar takes up significant horizontal space. On mobile (viewport < 768px), we will configure `react-day-picker` to render only `numberOfMonths={1}` and adjust the popover to act as a full-screen sheet or responsive modal. |
| Backend API Sync | MEDIUM | LOW | Ensure the date formats sent via URL params (e.g., ISO strings) are correctly parsed by the Go backend `GetAllEvents` function. We may need minor backend updates if date range filtering is not fully implemented yet. |

## Success Criteria

1. **Date Picker**: Clicking "Tất cả các ngày" opens a popover with a quick selection bar, a dual-month calendar (on desktop), and action footer.
2. **Date Logic**: Quick selections correctly highlight date ranges on the calendar. Clicking 'Apply' updates URL params.
3. **Advanced Filters**: Clicking "Bộ lọc" opens a sheet to select Price and Category, which sync to the URL upon applying.
4. **Visuals**: The calendar highlights current days, blurs out-of-month days, and uses the requested green accents for active states.
5. **Responsiveness**: The calendar and filter sheets adapt cleanly to mobile viewports.