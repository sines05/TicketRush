---
title: "Upgrade AI Agent UI Components Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/226e73f3-a2a4-4b58-85ca-4dc38a5a33aa/plans/2026-05-12-upgrade-ai-ui-components-design.md"
created: "2026-05-12T13:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 1
task_complexity: "medium"
---

# Upgrade AI Agent UI Components Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder, tester
- **Estimated effort**: Moderate. Replaces proof-of-concept UI logic with a dynamic extractor parsing `ToolMessage` outputs.

## Dependency Graph

```
[Phase 1: Implement Logic]
           |
           v
[Phase 2: Validation]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Core implementation |
| 2     | Phase 2 | Sequential | 1 | Verification |

## Phase 1: Implement UI Mapping Logic

### Objective
Replace the PoC UI generation in `graph.py` with logic that extracts and maps data from `ToolMessage`s.

### Agent: coder
### Parallel: No

### Files to Modify

- `ai-agent/graph.py` — Replace the hardcoded `ui_components` generation in `call_model` with logic that iterates backward through `messages` to find recent `ToolMessage`s (from `SearchEvents` or `GetEventDetails`), parses their JSON `content`, and maps them to `EventCard` dictionaries.

### Implementation Details

- In `call_model`, find all `ToolMessage`s that occurred after the last `AIMessage`.
- If `name == "SearchEvents"`, parse JSON, and for each event append an `EventCard`.
- If `name == "GetEventDetails"`, parse JSON and append an `EventCard` with detailed props.
- Overwrite the state's `ui_components` with the accumulated list.

### Validation

- Python syntax check: `cd ai-agent && python3 -m py_compile graph.py`

### Dependencies

- Blocked by: None
- Blocks: 2

---

## Phase 2: Verification

### Objective
Verify that the chatbot correctly returns UI components based on real tool data.

### Agent: tester
### Parallel: No

### Files to Modify
- None

### Implementation Details
- Write a quick test script (e.g., `test_ui.py`) that invokes `process_chat_message("Find events")` from `agent.py`.
- Verify the returned `ui_components` list contains the parsed mock events from `tools.py`.
- Delete the test script afterward.

### Validation
- Output of the test script confirms the presence of `EventCard` components matching the mock data.

### Dependencies

- Blocked by: 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `ai-agent/graph.py` | 1 | Implement dynamic UI extraction logic |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW  | Logic is isolated within `call_model` and fails gracefully on JSON parsing errors. |
| 2     | LOW  | Assessment only. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 2 mins
```