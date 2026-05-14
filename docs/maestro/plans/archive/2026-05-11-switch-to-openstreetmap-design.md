---
title: "Switch to OpenStreetMap"
created: "2026-05-11T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Switch to OpenStreetMap Design Document

## Problem Statement

We need to replace the current Google Maps integration with OpenStreetMap across the system. The current implementation uses the Google Maps API (`GoogleMapLocation.tsx`), which is currently only utilized on the Event Detail page (`EventDetail.jsx`) to display the event location in read-only mode. The goal is to swap this out for a free, open-source alternative (OpenStreetMap) while maintaining the visual presentation.

## Requirements

### Functional Requirements

1. **REQ-1**: Replace the Google Maps display with an OpenStreetMap implementation.
2. **REQ-2**: The new map component must accept an `initialLocation` (latitude, longitude) and display a marker at that position.
3. **REQ-3**: The map must support `readOnly` mode (which disables dragging the marker/changing location) as currently used in the Event Detail page.

### Non-Functional Requirements

1. **REQ-N1**: Performance: The new implementation should be lightweight and not significantly impact page load times.
2. **REQ-N2**: Aesthetics: The map container should retain its current styling (rounded corners, dark mode compatibility).

### Constraints

- **CON-1**: Avoid introducing heavy dependencies if a simpler solution (like an OSM iframe) suffices for read-only display, or use standard lightweight libraries (`leaflet`, `react-leaflet`) if interactive features are needed later.

## Approach

### Selected Approach

**React-Leaflet Integration**

We will implement the OpenStreetMap integration using `leaflet` and `react-leaflet`.
- **Map Library Replacement** — *[Replacing Google Maps with Leaflet allows us to render free OpenStreetMap tiles while retaining full programmatic control over markers and interactions, satisfying REQ-1, REQ-2, and REQ-3]* (Traces To: REQ-1, REQ-2, REQ-3) *(considered: Simple OSM Iframe — rejected because an iframe limits our ability to programmatically place custom markers or handle future read-write interactions seamlessly; considered: OpenLayers — rejected because React-Leaflet has a more established ecosystem for React integrations)*.
- **Component Abstraction** — *[Creating a new `OSMLocation.tsx` component that mirrors the props of the old `GoogleMapLocation.tsx` ensures a drop-in replacement in `EventDetail.jsx` without requiring extensive refactoring of the parent page, satisfying REQ-N2]* (Traces To: REQ-N2).

### Alternatives Considered

#### Simple OSM Iframe
- **Description**: Generate an embedding URL for OSM.
- **Pros**: Zero new dependencies.
- **Cons**: Difficult to style the marker, handle dynamic data, or support future non-read-only features.
- **Rejected Because**: It provides a suboptimal developer experience and limits future extensibility.

### Decision Matrix

| Criterion | Weight | React-Leaflet | Simple OSM Iframe |
|-----------|--------|---------------|-------------------|
| UX & Styling (REQ-N2) | 40% | 5: Full control over tiles and markers | 2: Limited styling control inside iframe |
| Extensibility | 30% | 5: Supports draggable markers if needed later | 1: Hard to pass events back to React |
| Dev Speed / Weight | 30% | 3: Requires `npm install`, slightly larger bundle | 5: No dependencies, instant implementation |
| **Weighted Total** | | **4.4** | **2.6** |

## Architecture

### Component Updates

```text
Dependency Changes
├── package.json (Add leaflet, react-leaflet, and @types/leaflet)

Component Replacement
├── frontend/src/components/Maps/OSMLocation.tsx (New component using Leaflet)
└── frontend/src/components/Maps/GoogleMapLocation.tsx (To be deleted/deprecated)

Integration
└── frontend/src/pages/Customer/EventDetail.jsx (Import and use OSMLocation instead of GoogleMapLocation)
```

### Data Flow Rationale

1. **Dependency Layer**: We will install `leaflet` and `react-leaflet` to provide the map rendering engine and React bindings.
2. **Component Layer**: `OSMLocation.tsx` will accept the same props as the old component (`initialLocation`, `readOnly`, `onLocationChange`). It will use `<MapContainer>`, `<TileLayer>` (pointing to OpenStreetMap's public tile server), and `<Marker>` from `react-leaflet`.
3. **Integration Layer**: `EventDetail.jsx` will be updated to import the new `OSMLocation` component, passing down the event's latitude and longitude seamlessly. The visual container around the map remains unchanged.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Install dependencies, create `OSMLocation.tsx`, and update `EventDetail.jsx`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Missing CSS for Leaflet | MEDIUM | HIGH | Ensure `leaflet/dist/leaflet.css` is imported in `OSMLocation.tsx` or `index.css` to prevent map tiles from rendering incorrectly. |
| Marker icon not loading | MEDIUM | MEDIUM | Provide a default icon configuration for Leaflet if the default asset paths fail in Vite. |

## Success Criteria

1. **SC-1**: The Event Detail page successfully renders an OpenStreetMap instead of Google Maps.
2. **SC-2**: The map is correctly centered on the event's latitude and longitude with a visible marker.
3. **SC-3**: No console errors related to Google Maps API keys are present.
