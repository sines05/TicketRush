---
title: "Category Overhaul Fixes"
created: "2026-05-10T18:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Category Overhaul Fixes Design Document

## Problem Statement

The recent update to category names introduced a "half-migrated" state that broke the search functionality. The frontend Search Overlay was updated to send stable category keys (e.g., `music_festival`) for filtering, but the database, seeder, and administrative forms are still storing and expecting localized labels (e.g., `Nhạc sống`). Consequently, search queries return zero results because the backend `IN` query attempts to match keys against labels. To resolve this, the system must be fully standardized on using stable keys for storage and data exchange, reserving labels purely for frontend presentation.

## Requirements

### Functional Requirements
1. **REQ-1 (Key-Based Storage)**: The `category` column in the `events` table must store stable category keys instead of localized labels.
2. **REQ-2 (Seeder Consistency)**: The database seeder (`cmd/seed/main.go`) must generate mock events using category keys.
3. **REQ-3 (Mock Data Consistency)**: The `EVENTS` mock array in `frontend/src/services/eventService.js` must use category keys.
4. **REQ-4 (Admin Form Submission)**: The event creation/edit form (`frontend/src/pages/Admin/EventForm.jsx`) must send the raw category key to the backend, not the mapped label.
5. **REQ-5 (Frontend Display)**: Any UI component displaying an event's category must use the `getCategoryLabel()` helper to translate the stored key back into a human-readable label.
6. **REQ-6 (Data Migration)**: Existing database records must be migrated from labels to keys.

### Non-Functional Requirements
1. **REQ-7 (Maintainability)**: Consolidating on keys prepares the system for potential future localization (i18n) efforts.

### Constraints
- Must not disrupt ongoing frontend or backend logic beyond fixing the category mismatch.

## Approach

### Selected Approach: Full Key-Based Standardization

We will implement a comprehensive migration across all application layers to ensure that only stable category keys (e.g., `music_festival`, `sports`) are stored, transmitted, and processed. Localized labels will be strictly reserved for frontend presentation, derived dynamically using the `getCategoryLabel` helper function. This involves a database migration to rectify existing records, updating the seeder to generate key-based data, modifying the admin creation form to submit keys, and ensuring all event display components render the translated label.

### Alternatives Considered

#### Revert Frontend to Send Labels
- **Description**: Modify the `SearchOverlay.jsx` and `App.jsx` to send localized labels (e.g., `?category=Nhạc sống`) instead of keys in the URL parameters.
- **Pros**: Quick fix; requires no database migration or backend changes.
- **Cons**: Severe architectural anti-pattern. URL parameters and database records become tightly coupled to the current language and specific phrasing. Any future renaming of a category would require migrating the database again. Prevents internationalization.
- **Rejected Because**: It perpetuates a fragile architecture. Storing localized display strings in the database as primary identifiers is fundamentally flawed and scales poorly (Traces To: REQ-7).

### Decision Matrix

| Criterion | Weight | Key-Based Standardization (Selected) | Revert Frontend to Labels |
|-----------|--------|--------------------------------------|---------------------------|
| Architectural Soundness (REQ-7) | 50% | 5: Decouples storage from presentation. | 1: Tightly couples storage and presentation. |
| Future Maintainability | 30% | 5: Renaming a category only requires a frontend constant change. | 2: Renaming requires DB migrations. |
| Speed of Implementation | 20% | 3: Requires touching multiple layers and a migration. | 5: Very fast, frontend-only fix. |
| **Weighted Total** | | **4.6** | **2.1** |

## Architecture

### Component Updates
<!-- Rationale: Storing keys but displaying labels ensures clean APIs and flexible UI. -->
*   **`frontend/src/services/eventService.js`**: Update the hardcoded `EVENTS` mock array to use `category: 'music_festival'` instead of `category: 'Âm nhạc & Lễ hội'`. *(Traces To: REQ-3)*
*   **`frontend/src/pages/Admin/EventForm.jsx`**: Modify the `onSubmit` handler to send `data.category` (the key) directly, rather than running it through `getCategoryLabel`. *(Traces To: REQ-4)*
*   **`frontend/src/components/home/EventCard.jsx` & `frontend/src/pages/Customer/SearchResults.jsx`**: Update the JSX rendering the category badge to wrap the raw `event.category` value with `getCategoryLabel(event.category)`. *(Traces To: REQ-5)*

### Data & Backend Flow
<!-- Rationale: The backend should act as the source of truth for keys, and the database should be updated to reflect this. -->
*   **`internal/models/event.go`**: Change the default value of the `Category` field in the GORM struct tag from `'Nhạc sống'` to `'music_festival'`.
*   **`cmd/seed/main.go`**: Change the `categories` array to use keys: `[]string{"music_festival", "sports", "arts_stage", "education_workshop", "experience_entertainment", "other"}`. Ensure the static first 3 events also use these keys. *(Traces To: REQ-2)*
*   **Database Migration**: Create `000014_migrate_category_labels_to_keys.up.sql` to execute `UPDATE events SET category = 'music_festival' WHERE category IN ('Âm nhạc & Lễ hội', 'Nhạc sống');` (and similarly for other categories) to retroactively fix the data. *(Traces To: REQ-6)*

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `data_engineer`  | No       | Create DB migration `000014` and update `cmd/seed/main.go` and `internal/models/event.go`. |
| 2     | `coder`  | No       | Update `eventService.js`, `EventForm.jsx`, `EventCard.jsx`, and `SearchResults.jsx`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Incomplete Migration | HIGH | LOW | The migration must account for both the original labels (e.g., "Âm nhạc & Lễ hội") and the newer ones (e.g., "Nhạc sống") when updating to the key ("music_festival") to ensure no events are orphaned with invalid categories. |
| Missing Label Fallbacks | LOW | LOW | Ensure `getCategoryLabel()` safely falls back to a title-cased string or a default value if an unknown key is encountered. |

## Success Criteria

1.  **Filtering Restored**: Clicking a category in the navigation bar successfully filters events on the Search Results page.
2.  **Database Inspection**: Checking the `category` column in the `events` table shows keys like `music_festival`, not localized text.
3.  **Admin Creation**: Submitting a new event via the Admin dashboard saves a category key to the database.
4.  **UI Presentation**: All frontend cards (EventCard, SearchResultCard) display friendly labels (e.g., "Nhạc sống"), not keys.