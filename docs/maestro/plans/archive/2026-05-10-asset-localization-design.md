---
title: "Asset Localization"
created: "2026-05-10T14:45:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "simple"
---

# Asset Localization Design Document

## Problem Statement
The Search Overlay currently relies on external Unsplash image URLs for rendering Category cards, City cards, and the "Other Locations" grid. This creates a dependency on an external service, which can lead to slow loading times during demonstrations, broken images if network conditions are poor, or missing assets if the external service changes. 

## Requirements

### Functional Requirements
1. **REQ-1 (Local Asset Storage)**: All previously external images must be downloaded and stored locally within the project structure (e.g., `frontend/src/assets/categories/` and `frontend/src/assets/locations/`).
2. **REQ-2 (Component Update)**: React components and constant files (`SearchOverlay.jsx` and `locations.js`) must be updated to import and use these local assets instead of external URLs.

### Non-Functional Requirements
1. **REQ-3 (Performance)**: Local assets should load faster and eliminate external network requests for these specific components.

## Approach

### Selected Approach
**Shell Download and React Import Refactoring**

We will use shell commands (`curl` or `wget`) to download the 16 required images (6 categories, 6 cities, 4 "other" thumbnails) into newly created subdirectories under `frontend/src/assets/`. Once downloaded, we will refactor `locations.js` to import the local images and export them within `CITY_OPTIONS`. We will also refactor `SearchOverlay.jsx` to import the category and "other" images and use them in `CATEGORY_IMAGES` and `OTHER_CITY_IMAGES` respectively.

### Decision Matrix

| Criterion | Weight | Local Imports (Selected) | Public Folder Storage |
|-----------|--------|--------------------------|-----------------------|
| Bundler Optimization | 50% | 5: Vite can hash and optimize imported assets automatically. | 3: Assets in `/public` are served as-is, requiring manual cache busting if changed. |
| Code Co-location | 50% | 5: Assets live near the source code that uses them (`src/assets`). | 2: Assets live outside `src`, making component portability harder. |
| **Weighted Total** | | **5.0** | **2.5** |

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Download images and refactor `locations.js` and `SearchOverlay.jsx`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Image Size | MEDIUM | LOW | Ensure the downloaded images are pre-cropped and sized correctly via the Unsplash query parameters before saving to disk to prevent repository bloat. |

## Success Criteria
1. Images are stored locally in `frontend/src/assets/`.
2. `SearchOverlay.jsx` and `locations.js` import and use these local images instead of external URLs.
