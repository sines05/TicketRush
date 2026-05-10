---
title: "Search Results Page Implementation"
created: "2026-05-10T15:15:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Search Results Page Implementation Design Document

## Problem Statement

The application currently redirects search queries from the Search Overlay but lacks a dedicated, robust Search Results page to display these events. We need a specialized page that focuses entirely on displaying filtered event results using a 4-column grid layout, along with a top bar containing robust filtering controls (date, advanced filters, location).

## Requirements

### Functional Requirements
1. **REQ-1 (Search Top Bar)**: A top bar must display "Kết quả tìm kiếm" alongside controls for date selection ("Tất cả các ngày" with calendar icon), advanced filtering (green button with funnel icon), and location selection ("Vị trí khác" with map pin icon).
2. **REQ-2 (Grid Layout)**: The main content area must use a 4-column CSS grid with generous gutters (`gap`) to display event cards without visual clutter.
3. **REQ-3 (URL-Driven State)**: The search, category, location, and date filters must be synchronized with URL search parameters (e.g., `?q=jack&location=hanoi&date=upcoming`).
4. **REQ-4 (Event Card Alignment)**: Display cards containing a landscape poster (1/2 card height, slightly rounded), a bold title limited to 2 lines, a green starting price ("Từ [Giá]"), and the event date with a calendar icon. Existing `EventCard` component will be adapted or reused.

### Non-Functional Requirements
1. **REQ-5 (Responsiveness)**: The 4-column grid should collapse gracefully on smaller screens (e.g., 1 column on mobile, 2 on tablet, 4 on desktop).

### Constraints
- Must integrate with existing `eventService` fetching logic, appending URL params to backend API requests.

## Approach

### Selected Approach
**URL-Synchronized Page Component**

We will create a new `SearchResults.jsx` page component inside `frontend/src/pages/Customer/`. It will read query parameters using `useSearchParams()`, pass them to `eventService.getEvents()`, and render the results. The Top Bar will contain interactive filter buttons that update the URL parameters, which in turn triggers a re-fetch of data.

### Alternatives Considered
#### Local State Filtering
- **Description**: Fetching all events once and filtering them purely in React state.
- **Pros**: Instant UI updates.
- **Cons**: Does not support deep linking or sharing specific search results; poor performance with large datasets.
- **Rejected Because**: The user explicitly confirmed a preference for URL-driven backend filtering to support shareable links and scalable data loading.

### Decision Matrix

| Criterion | Weight | URL-Driven Backend Filter | Local State Filter |
|-----------|--------|---------------------------|--------------------|
| Shareability (Deep Linking) | 40% | 5: Fully supports copying and sharing URLs. | 1: State is lost on refresh or share. |
| Scalability | 40% | 5: Offloads filtering to the backend DB. | 2: Requires loading all data to the client. |
| UI Responsiveness | 20% | 4: Requires a loading state during fetch. | 5: Instant filtering. |
| **Weighted Total** | | **4.8** | **2.2** |

## Architecture

### Component Diagram
```
AppRoutes
└── SearchResults (Page)
    ├── TopBar
    │   ├── Title
    │   ├── DateFilterDropdown (updates URL)
    │   ├── AdvancedFilterBtn
    │   └── LocationFilterBtn (updates URL)
    └── GridContainer (grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8)
        └── EventCard (Customized for Search)
            ├── Image (aspect-video, rounded-lg)
            ├── Title (font-bold, line-clamp-2)
            └── Meta (Price in green, Date with Calendar icon)
```

### Data Flow
1. User lands on `/search?q=jack&location=hanoi`.
2. `SearchResults` reads URL params via `useSearchParams()`.
3. A `useEffect` or `react-query` calls `eventService.getEvents(params)`.
4. Results map to `EventCard` components inside the 4-column grid.
5. User changes filter via Top Bar -> Updates URL params -> Triggers re-fetch.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Create `SearchResults.jsx`, update `AppRoutes.jsx`, and build the custom grid and cards. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| EventCard Consistency | LOW | MEDIUM | The existing `EventCard` might not perfectly match the specific 1/2 height image or exact layout requested. We will create a specialized card design directly inside `SearchResults.jsx` or a highly configurable sub-component if differences are substantial. |
| API Filtering Parity | MEDIUM | LOW | Ensure `eventService.getEvents` properly constructs query strings and that the backend handles parameters appropriately. We verified basic location/query filtering exists. |

## Success Criteria

1. **Routing**: Navigating to `/search` loads the new page.
2. **Top Bar**: Displays the required title, Date dropdown, green Filter button, and Location button.
3. **Grid Layout**: Displays events in a 4-column grid on desktop with wide gutters (`gap-8`).
4. **Card Design**: Cards show a landscape image taking up roughly half the card, a max 2-line bold title, green "Từ [Giá]" text, and the date with an icon.