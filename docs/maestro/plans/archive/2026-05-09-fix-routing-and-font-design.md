# Fix Trending Events Routing and Font Blurriness Design

## Problem
1. Trending events redirect directly to booking instead of detail.
2. Backdrop filter blur causes font blurriness in UI containers.

## Solution
1. Update `TrendingEvents.jsx` navigation.
2. Reduce `backdrop-filter` in `index.css` from `12px` to `4px`.
