---
title: "Switch to OpenStreetMap Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-11-switch-to-openstreetmap-design.md"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 4
estimated_files: 3
task_complexity: "medium"
---

# Switch to OpenStreetMap Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: coder
- **Estimated effort**: Moderate. Involves adding dependencies, creating a new component, and updating integration.

## Dependency Graph

```text
Phase 1: Foundation & Dependencies
    │
    ▼
Phase 2: OSMLocation Implementation
    │
    ▼
Phase 3: Integration & Migration
    │
    ▼
Phase 4: Cleanup & Validation
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Dependency setup |
| 2     | Phase 2 | Sequential | 1 | Component creation |
| 3     | Phase 3 | Sequential | 1 | Integration |
| 4     | Phase 4 | Sequential | 1 | Verification |

## Phase 1: Foundation & Dependencies

### Objective
Install the necessary npm packages for OpenStreetMap integration.

### Agent: coder
### Parallel: No

### Implementation Details
- Run `npm install leaflet react-leaflet` in the `frontend/` directory.
- Run `npm install -D @types/leaflet` in the `frontend/` directory.

### Validation
- Verify `package.json` contains the new dependencies.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: OSMLocation Implementation

### Objective
Create a new map component using Leaflet and OpenStreetMap tiles.

### Agent: coder
### Parallel: No

### Files to Create
- `frontend/src/components/Maps/OSMLocation.tsx` — Implement the map using `MapContainer`, `TileLayer`, and `Marker` from `react-leaflet`.

### Implementation Details
- Import `leaflet/dist/leaflet.css` within the component or `index.css`.
- Accept `initialLocation` ({ lat, lng }), `readOnly` (boolean), and `onLocationChange` (callback) props.
- Use `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` for the `TileLayer`.
- Implement a custom marker setup to ensure the Leaflet default icons load correctly (often requires fixing asset paths in Vite).
- Use `useMapEvents` for handling clicks if `!readOnly`.

### Validation
- Component compiles without errors.

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

---

## Phase 3: Integration & Migration

### Objective
Switch the Event Detail page to use the new OpenStreetMap component.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/pages/Customer/EventDetail.jsx` — Replace `GoogleMapLocation` with `OSMLocation`.

### Implementation Details
- Update the import statement.
- Replace the JSX element, ensuring props are passed correctly.

### Validation
- Event Detail page renders correctly in dev mode.

### Dependencies
- Blocked by: Phase 2
- Blocks: Phase 4

---

## Phase 4: Cleanup & Validation

### Objective
Remove the deprecated Google Maps component and verify the build.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/components/Maps/GoogleMapLocation.tsx` — Delete this file.

### Implementation Details
- Delete the old component file.
- Run `npm run build` in the `frontend/` directory.
- Run `npm run lint` in the `frontend/` directory.

### Validation
- Build and lint pass successfully.

### Dependencies
- Blocked by: Phase 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/package.json` | 1 | Dependency management |
| 2 | `frontend/src/components/Maps/OSMLocation.tsx` | 2 | New OSM component |
| 3 | `frontend/src/pages/Customer/EventDetail.jsx` | 3 | Integration point |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Standard npm package installation. |
| 2 | MEDIUM | Leaflet CSS and asset path issues are common in build tools like Vite. |
| 3 | LOW | Drop-in replacement for a single component. |
| 4 | LOW | Clean build verification. |

## Execution Profile

```text
Execution Profile:
- Total phases: 4
- Parallelizable phases: 0
- Sequential-only phases: 4
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 60 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
