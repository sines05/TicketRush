---
title: "Location Cards Refinement"
created: "2026-05-10T14:25:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Location Cards Refinement Design Document

## Problem Statement

The current "City" cards in the Search Overlay feature centered text and uniform dark masks, lacking the visual distinctiveness needed to capture user attention. To improve user engagement and visual hierarchy, these cards need to be redesigned with top-left aligned bold text, sophisticated gradient overlays, softer border radii, and a distinct "Vị trí khác" (Other Locations) card featuring a 2x2 grid of thumbnails. Furthermore, the backend currently lacks the ability to filter for events outside the primary cities.

## Requirements

### Functional Requirements
1. **REQ-1**: Render city cards using landscape imagery.
2. **REQ-2**: Position city names at the top-left corner using a bold, sans-serif white font.
3. **REQ-3**: Add a subtle dark gradient overlay specifically behind the text area to ensure readability regardless of the background image.
4. **REQ-4**: Apply soft border radii to all cards for a modern, friendly feel.
5. **REQ-5**: Introduce a specialized "Vị trí khác" (Other Locations) card at the end of the list. This card must display a 2x2 grid of 4 static, distinct thumbnail images instead of a single background image.
6. **REQ-6**: The backend must support querying for `location=other`, which returns events located in any city EXCEPT the main predefined cities.

### Non-Functional Requirements
1. **REQ-7**: Cards must be arranged horizontally and maintain consistent aspect ratios/sizes across different devices.

### Constraints
- The UI must integrate smoothly within the existing `SearchOverlay.jsx` grid structure and Tailwind CSS ecosystem.

## Approach

### Selected Approach
**Tailwind-Driven Layout with Gradient Overlays & Backend Exclude Filter**

We will update `SearchOverlay.jsx` to modify the rendering of `CITY_OPTIONS`. Text positioning will shift from `items-center justify-center` to `items-start justify-start p-4`. The overlay will change from a solid `bg-black/40` to a `bg-gradient-to-b from-black/60 via-black/20 to-transparent`. The "Other Locations" card will be conditionally rendered as the last item, using an internal CSS grid to display four distinct thumbnails. 

In the backend, the `GetAllEvents` repository method will be updated to check if `location == "other"`. If so, it will use a `NOT IN` clause to exclude 'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'.

### Alternatives Considered
#### Single Background Image for "Other Locations"
- **Description**: Finding a pre-made image collage on Unsplash to represent "Other Locations".
- **Pros**: Simpler implementation, requires no internal grid structure.
- **Cons**: Less flexible, harder to swap out individual thumbnails in the future, scaling might distort the collage.
- **Rejected Because**: The user explicitly requested a card "ghép 4 ảnh nhỏ" (composed of 4 small images) to visually signal multiplicity. A native CSS grid provides sharper rendering and future flexibility.

### Decision Matrix

| Criterion | Weight | Tailwind Grid (Selected) | Single Collage Image |
|-----------|--------|---------------------------|----------------------|
| Visual Distinctiveness (REQ-5) | 50% | 5: CSS grid provides crisp borders between thumbnails. | 3: Pre-made collage might look muddy or scale poorly. |
| Maintainability | 30% | 4: Easy to update array of 4 URLs. | 2: Requires graphic editing to change images. |
| Performance | 20% | 3: Loads 4 small images. | 4: Loads 1 image. |
| **Weighted Total** | | **4.3** | **3.1** |

## Architecture

### Component Structure
The changes will be localized within `frontend/src/components/common/SearchOverlay.jsx`.

*   **Location Card Container**: The `grid` container for location cards will be maintained, but the cards themselves will use `rounded-2xl` for softer corners.
*   **Standard Location Card**:
    *   Image: `absolute inset-0 w-full h-full object-cover`.
    *   Overlay: `absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-transparent`. — *[Ensures white text is readable at the top left without obscuring the bottom landscape. Traces To: REQ-3]*
    *   Content Wrapper: `absolute inset-0 p-4 flex flex-col items-start justify-start`. — *[Aligns text to the top-left. Traces To: REQ-2]*
    *   Typography: `text-white font-extrabold text-lg tracking-tight`. — *[Uses bold sans-serif styling. Traces To: REQ-2]*
*   **"Other Locations" Card**:
    *   Appended to the end of the mapped `CITY_OPTIONS` list.
    *   Inner structure uses `grid grid-cols-2 grid-rows-2 gap-[2px]` taking up the full absolute inset space. — *[Creates the 4-thumbnail composition. Traces To: REQ-5]* *(considered: flex wrapping — rejected because grid is much stricter and easier to enforce equal quadrants)*
    *   Four static thumbnail URLs will be defined in a constant array within the component.
    *   Shares the same gradient overlay and typography styling as standard cards to maintain consistency.

### Data Flow
*   **Backend Update**: The `GetAllEvents` repository method in `internal/repository/event_repository.go` will be updated to handle `location=other`. When this parameter is received, the query will exclude the main cities (e.g., `location NOT IN ('Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ')`).
*   **Seeder Update**: `cmd/seed/main.go` will be updated to include an event in an "other" city (e.g., Đà Lạt) to verify the new filter.
*   **Frontend Action**: The "Other Locations" card will trigger `handleSearchAction({ location: 'other' })`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Refactor `SearchOverlay.jsx` for the new UI, update `event_repository.go` for the "other" filter, and add a seed event in `cmd/seed/main.go`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Backend Filter Logic | LOW | LOW | Ensure the `NOT IN` clause accurately matches the exact strings used in the database for the main cities to prevent false positives. |
| Thumbnail Resolution | MEDIUM | LOW | Use high-quality Unsplash URLs with query parameters (`&w=200&q=80`) to ensure the 4 small images load quickly but remain sharp on retina displays. |

## Success Criteria

1.  City cards feature landscape imagery with soft border radii (`rounded-2xl`).
2.  City names are positioned at the top-left, rendered in bold white sans-serif text.
3.  A subtle top-down dark gradient overlays the image, ensuring text readability without obscuring the landscape below.
4.  The "Vị trí khác" card successfully displays a 2x2 grid of 4 distinct thumbnails.
5.  Clicking "Vị trí khác" queries the backend with `location=other`, which correctly returns events located outside the main cities (e.g., Đà Lạt).
