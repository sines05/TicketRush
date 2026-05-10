---
title: "Search Functionality Refinement"
created: "2026-05-10T14:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Search Functionality Refinement Design Document

## Problem Statement

The current search overlay occupies the full screen and functions as a live-search dropdown. To improve user focus and aesthetic quality, it needs to be redesigned into a structured, proportioned "panel" that floats above the page content. The new design must emphasize visual discovery (categories, suggestions) over text, maintain contextual awareness by not obscuring the entire page on desktop, and act purely as a gateway rather than a live-results container.

## Requirements

### Functional Requirements

1. **REQ-1 (Redirection over Live Search)**: Typing in the search input does not update the modal's content. Pressing Enter or clicking "Tìm kiếm" redirects the user to the search results page with the query parameter.
2. **REQ-2 (Content Ratio)**: The modal content must dedicate approximately 20% of its vertical space to text-based elements (search input, history, trends) and 80% to image-based cards (categories, cities, personalized suggestions).
3. **REQ-3 (Mobile Responsiveness)**: The overlay must occupy 100% width and 100% available height on mobile devices, optimizing for touch targets.

### Non-Functional Requirements

1. **REQ-4 (Viewport Proportions)**: On desktop, the overlay must be 60-70% of the screen width (centered) and 70-80% of the viewport height.
2. **REQ-5 (Anchoring)**: The overlay and its background mask must render strictly below the main header, leaving the header fully visible and illuminated.
3. **REQ-6 (Visual Hierarchy)**: The overlay must use distinct drop shadows/borders to "float" above a 40-60% opacity dark background mask.

### Constraints

- The current header is 80px tall (`h-20`). The layout must accurately offset by this amount to prevent overlap.

## Approach

### Selected Approach

**Viewport-Fixed Positioning with Top Offset**

We will use `fixed` positioning for the overlay, setting `top-[80px]` to start exactly below the header. The background mask will share these coordinates. The internal layout will use CSS Flexbox to enforce the 20%/80% vertical split between text and image areas.

### Alternatives Considered

#### Header-Relative Absolute Positioning

- **Description**: Making the `<header>` `relative` and the overlay `absolute` inside it.
- **Pros**: Semantically ties the search to the header.
- **Cons**: Can cause z-index conflicts with page content and makes the background mask harder to stretch across the full viewport height without breaking out of the header bounds.
- **Rejected Because**: The background mask needs to cover the entire page content below the header (Traces To: REQ-5), which is much more reliably achieved with `fixed` viewport positioning.

### Decision Matrix

| Criterion | Weight | Viewport-Fixed (Top Offset) | Header-Relative |
|-----------|--------|-----------------------------|-----------------|
| Mask Coverage (REQ-5) | 40% | 5: Naturally covers the remaining viewport height. | 2: Difficult to stretch full height without hacks. |
| Responsiveness (REQ-3, REQ-4) | 40% | 5: Easy to use `vw`/`vh` or percentage units for width/height. | 3: Requires recalculating relative to the header's container. |
| Z-Index Management | 20% | 4: Safe top-level stacking context. | 2: Risk of being clipped by parent `overflow` or sibling `z-index`. |
| **Weighted Total** | | **4.8** | **2.4** |

## Architecture

### Component Structure

* **Overlay Wrapper**: `fixed top-[80px] left-0 right-0 bottom-0 z-[90]` — *[Ensures it anchors below the header (which is z-50 normally, but we might need to adjust header z-index to be >90 or just position the overlay correctly). Traces To: REQ-5]* *(considered: `fixed inset-0` with margin-top — rejected because the mask would still overlay the header)*
* **Background Mask**: A div with `bg-black/50` — *[Provides the 40-60% opacity darkening effect. Traces To: REQ-6]*
* **Main Panel**: A centered div with `w-full max-w-[65%] h-[75dvh]` on desktop, and `w-full h-full` on mobile. — *[Satisfies the dimensional constraints. Traces To: REQ-3, REQ-4]*
* **Internal Split**: A Flex container:
  * **Top Section (20%)**: Search input, "Lịch sử tìm kiếm", "Xu hướng tìm kiếm" (with Zap icon). — *[Traces To: REQ-2]*
  * **Bottom Section (80%, overflow-y-auto)**: Image Tabs and "Gợi ý dành cho bạn" cards. — *[Prioritizes visual elements. Traces To: REQ-2]*

### Data Flow

The component fetches Trending Events on mount. Pressing Enter triggers `navigate(/?q=query)` — *[Removes unnecessary state complexity. Traces To: REQ-1]*

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Complete refactor of `SearchOverlay.jsx` to implement the new layout and behavior. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Mobile Height Issues | MEDIUM | HIGH | Use `100dvh` or `h-[calc(100dvh-80px)]` to avoid mobile browser address bar clipping. |
| Z-Index Conflicts | LOW | LOW | Ensure header has higher z-index than the overlay background if needed, or simply render overlay starting at top: 80px. |

## Success Criteria

1. The search panel consumes 60-70% width and 70-80% height on desktop, 100% on mobile.
2. Dark mask (40-60% opacity) covers the page below the header.
3. Top 20% contains text inputs/history, bottom 80% contains scrollable visual cards.
4. Submitting a search redirects the user; typing does not fetch live results.
