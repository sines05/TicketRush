---
title: "TicketRush Homepage UI Refactor (Ticketbox Clone)"
created: "2026-05-18T14:10:00.000Z"
status: "approved"
authors: ["Gemini CLI", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# TicketRush Homepage UI Refactor Design Document

## Problem Statement
The TicketRush platform currently uses a "glass-morphism" and modern UI aesthetic that diverges from the user's goal of cloning the `ticketbox.vn` interface. To align with user expectations, the Home page must be refactored to mirror the color palette, layout structure, and interaction patterns of Ticketbox, specifically the header and category navigation, while ensuring that the underlying business logic, authentication flows, and backend processing remain completely intact.

## Requirements

### Functional Requirements
1.  **REQ-1 (Header Refactor):** Implement a solid green header (`#26BC4E`) with an inline, functional search bar that replaces the current search overlay trigger.
2.  **REQ-2 (Navigation):** Reposition the category navigation from a sticky top bar to a content-level section below the hero carousel.
3.  **REQ-3 (Adaptive Theme):** Create a dark mode variant for the green Ticketbox theme to maintain compatibility with existing TicketRush features.
4.  **REQ-4 (Styling):** Update component styles (typography, borders, spacing) for `HeroCarousel`, `SpecialEvents`, `TrendingEvents`, and `EventListWithTabs` to match Ticketbox aesthetics.

### Non-Functional Requirements
1.  **REQ-5 (Logic Integrity):** No changes to backend APIs or frontend state management logic.
2.  **REQ-6 (Performance):** Ensure the inline search bar maintains current search performance and debouncing.

## Approach

### Selected Approach: Hybrid Clone Refactor
We will implement a structural refactor of the Header and Category Navigation to match the "flat" Ticketbox layout, while applying a "Skin-Deep" restyling to the existing event sections. This approach provides the visual impact of a clone without the high risk of breaking complex business logic within the vertical-specific sections like `TrendingEvents`.

### Key Decisions & Rationale
1.  **Inline Search Bar** — *Chosen to match the Ticketbox interaction model exactly, despite requiring more complex Header JSX changes.* (considered: Styled Trigger — rejected because it doesn't provide the "immediate" search feel of the clone). Traces To: REQ-1.
2.  **Adaptive Dark Mode** — *Ensures users of the current TicketRush app are not jarred by a light-only experience, using Forest Green variants.* Traces To: REQ-3.
3.  **Content-Level Category Nav** — *Prioritizes clone accuracy over the high usability of the current sticky bar.* Traces To: REQ-2.
4.  **Varied Section Styling** — *Keeps existing specialized logic (ranks, banners) while skinning them with Ticketbox colors and fonts.* (considered: Uniform Carousels — rejected to avoid redundant work where existing components already provide high value). Traces To: REQ-4.

### Decision Matrix

| Criterion | Weight | Uniform (Clone) | Varied (Hybrid) |
| :--- | :--- | :--- | :--- |
| **Visual Accuracy** | 40% | 5: Exact match to Ticketbox layout. | 4: Matches colors/fonts; keeps layout variety. |
| **Dev Efficiency** | 30% | 2: Requires complete rewrite of event lists. | 5: Leverages existing components. |
| **Logic Safety** | 30% | 3: Risk of breaking data-binding in list rewrites. | 5: Zero change to data-binding logic. |
| **Weighted Total** | | **3.5** | **4.6** |

## Architecture

### Component Mapping

| Current Component | New Ticketbox Style | Change Type |
| :--- | :--- | :--- |
| `App.jsx` (Header) | `Header.jsx` (Refactored) | **Structural:** Add inline input, change bg to green, reposition nav links. |
| `App.jsx` (CategoryNav) | `CategorySection.jsx` | **Relocation:** Move from sticky bar to `Home.jsx` content body. |
| `HeroCarousel.jsx` | `HomeHero.jsx` | **Skinning:** Update arrows, indicators, and image container aspect ratios. |
| `TrendingEvents.jsx` | `TrendingRefined.jsx` | **Skinning:** Replace fire icons/rank colors with Ticketbox green accents. |
| `EventCard.jsx` | `EventCardRefined.jsx` | **Skinning:** Update border-radius (smaller), price font weight, and spacing. |

### Key Interfaces
*   **Search Integration:** The inline search input will consume the existing `eventSearch` state and `setEventSearch` setter defined in `App.jsx`. [Traces To: REQ-5]
*   **Theme Tokens:** Use CSS variables for the Ticketbox green (`--tb-primary: #26BC4E`). [Traces To: REQ-3]

## Agent Team

| Phase | Agent | Rationale |
| :--- | :--- | :--- |
| **Design/Token** | `design_system_engineer` | Define Ticketbox theme and dark mode tokens. |
| **Implementation**| `coder` | Refactor Header, Home layout, and restyle components. |
| **Validation**    | `ux_designer` | Visual audit against target clone. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- |
| **Header Z-Index Issues** | MEDIUM | MEDIUM | Ensure search bar doesn't clash with modals. |
| **Mobile Responsiveness** | MEDIUM | MEDIUM | Collapse inline search to icon on mobile. |
| **Logic Regression** | LOW | LOW | Perform manual verification of search functionality. |

## Success Criteria
1.  Visual Match: Header background is `#26BC4E` with functional inline search.
2.  Layout Match: Category navigation is within the content area.
3.  Behavioral Consistency: Search correctly filters events.
4.  No Logic Breaks: Auth-specific features remain functional.
