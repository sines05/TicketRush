---
title: "Fix UI Interaction Issues (V2)"
created: "2026-05-13T00:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix UI Interaction Issues (V2) Design Document

## Problem Statement

We need to fix four related interaction issues on the Home Page:
1. **Carousel Navigation Blocked**: The `HeroCarousel` left/right arrows are unclickable because they sit beneath the slides (`z-10` vs Swiper's internal stacking) and rely on hover states (`opacity-0`), rendering them unusable on touch devices.
2. **Location Card Blocked**: The "VỊ TRÍ KHÁC" card in `LocationCards` sits at the bottom-right of its grid, directly underneath the fixed `ChatWidget` (`z-50`). The widget's invisible container blocks pointer events, preventing users from clicking the card.
3. **Swiper Loop Bug**: `HeroCarousel` has `loop={events.length > 2}`, but it displays 2 slides per view on desktop. If exactly 2 events exist, Swiper disables navigation buttons unexpectedly.
4. **Selector Binding Fragility**: Swiper navigation relies on string selectors (e.g., `.hero-carousel-next`), which can fail if multiple carousels mount concurrently or if DOM timing is slightly off in React.

## Requirements

1. **Carousel Navigation**: Arrows must be clickable, visible on touch devices, and reliably bound to Swiper.
2. **Carousel Loop**: Loop logic must dynamically respect `slidesPerView` breakpoints.
3. **Location Card**: "VỊ TRÍ KHÁC" must be clickable regardless of the ChatWidget's presence.

## Approach

### Selected Approach

**Targeted CSS & React Ref Adjustment (Pragmatic Path)**

We will apply precise surgical fixes to the existing layout rather than drastically altering the UI structure.
- **Carousel**: Increase arrow `z-index` to `z-30`. Refactor string selectors (`.hero-carousel-next`) to use React `useRef` bindings passed to Swiper's `onSwiper` event. Adjust mobile CSS to ensure arrows remain visible without hover states. Update loop condition to check against current `slidesPerView`.
- **Location Cards / ChatWidget**: We will add `pointer-events-none` to the ChatWidget's fixed wrapper container so clicks pass through to the cards below, while maintaining `pointer-events-auto` strictly on the widget button itself.

### Alternatives Considered

**Structural UI Refactor (Long-term)**

- Moving carousel arrows outside the image container and relocating the ChatWidget to a persistent sidebar.
- *Rejected Because: This requires significant layout restructuring disproportionate to the task at hand. The current UI design is visually sound; it just suffers from minor stacking context bugs.*

### Decision Matrix

| Criterion | Weight | Targeted CSS & Refs | Structural UI Refactor |
|-----------|--------|---------------------|------------------------|
| Implementation Speed | 40% | 5: Small, localized changes | 2: Requires touching many components |
| Layout Stability | 40% | 4: Preserves existing visual design | 3: High risk of breaking responsiveness |
| Root Cause Fix | 20% | 5: Fixes exact stacking and binding bugs | 5: Avoids bugs via redesign |
| **Weighted Total** | | **4.6** | **3.0** |

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Fix HeroCarousel navigation and ChatWidget stacking |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Swiper re-render glitch | MEDIUM | LOW | Using `useState` and `onSwiper` to safely bind React refs ensures navigation buttons always sync with the Swiper instance lifecycle. |
| ChatWidget pointer capture | LOW | LOW | Restricting `pointer-events-none` to the outer wrapper ensures the main toggle button remains clickable while fixing the background blocking issue. |

## Success Criteria

1. The left/right arrows on `HeroCarousel` are clickable on desktop and visible/clickable on mobile.
2. The "VỊ TRÍ KHÁC" card in `LocationCards` can be clicked without interference from the ChatWidget.
3. The Carousel's loop logic functions correctly even when there are exactly 2 events on a desktop view.
