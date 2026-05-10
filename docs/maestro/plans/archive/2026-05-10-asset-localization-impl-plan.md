---
title: "Asset Localization Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/798b7daf-148e-4146-85dd-10511f7bfb00/plans/2026-05-10-asset-localization-design.md"
created: "2026-05-10T14:50:00Z"
status: "approved"
total_phases: 3
estimated_files: 3
task_complexity: "simple"
---

# Asset Localization Implementation Plan

## Plan Overview
- **Total phases**: 3
- **Agents involved**: `coder`
- **Estimated effort**: Quick task involving directory management, file downloads, and code refactoring.

## Dependency Graph
```
[Phase 1: Asset Organization] -> [Phase 2: Constants Refactoring] -> [Phase 3: Component Refactoring]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Create directories and download images |
| 2     | Phase 2 | Sequential | 1 | Update `locations.js` |
| 3     | Phase 3 | Sequential | 1 | Update `SearchOverlay.jsx` |

## Phase 1: Asset Organization
### Objective
Create local directories and download all external images used in the search functionality.

### Agent: coder
### Parallel: No

### Implementation Details
1. Create directories:
   - `frontend/src/assets/categories/`
   - `frontend/src/assets/locations/`
   - `frontend/src/assets/misc/`
2. Download images using `curl`:
   - Categories (6): music, sports, arts, education, entertainment, community.
   - Cities (6): hcm, hanoi, danang, dalat, nhatrang, cantho.
   - Other thumbnails (4): other_1, other_2, other_3, other_4.

### Validation
- Verify all 16 files exist in their respective directories.

## Phase 2: Constants Refactoring
### Objective
Update `frontend/src/constants/locations.js` to import and use the local city images.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/constants/locations.js`

### Implementation Details
- Import the 6 city images at the top of the file.
- Update `CITY_OPTIONS` to use the imported image variables.

### Validation
- Ensure `locations.js` exports the updated `CITY_OPTIONS`.

## Phase 3: Component Refactoring
### Objective
Update `SearchOverlay.jsx` to import and use local category and "other" images.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/components/common/SearchOverlay.jsx`

### Implementation Details
- Import the 6 category images.
- Import the 4 "other" city images.
- Update `CATEGORY_IMAGES` and `OTHER_CITY_IMAGES` constants within the component to use the imports.

### Validation
- Verify the Search Overlay renders correctly without external image errors.

---

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/constants/locations.js` | 2 | City constants |
| 2 | `frontend/src/components/common/SearchOverlay.jsx` | 3 | Search UI component |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Simple shell operations. |
| 2 | LOW | Standard constant refactoring. |
| 3 | LOW | Component refactoring. |

## Execution Profile
```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: 5m
- Estimated sequential wall time: 5m
```
