---
title: "Optimize AI Agent Tool Integration Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/226e73f3-a2a4-4b58-85ca-4dc38a5a33aa/plans/2026-05-12-optimize-agent-tools-design.md"
created: "2026-05-12T15:10:00Z"
status: "approved"
total_phases: 2
estimated_files: 3
task_complexity: "medium"
---

# Optimize AI Agent Tool Integration Implementation Plan

## Phase 1: Implement New Tools and Prompts

### Objective
Expose `/events/trending` and `/events/featured` as tools to the AI agent, update the prompt to guide tool selection, and update the graph to render their outputs.

### Agent: coder
### Parallel: No

### Files to Modify

- `ai-agent/tools.py`
  - Import `requests` (if not already there).
  - Add `get_trending_events()` function calling `http://backend:8080/api/v1/events/trending`.
  - Add `get_featured_events()` function calling `http://backend:8080/api/v1/events/featured`.
  - Update `tools` list to include `GetTrendingEvents` and `GetFeaturedEvents`.
- `ai-agent/prompts.py`
  - Update `SYSTEM_PROMPT`.
- `ai-agent/graph.py`
  - Update `call_model` to handle the new tool names.

### Validation
- Run `cd ai-agent && python3 -m py_compile tools.py prompts.py graph.py`

### Dependencies
- Blocked by: None
- Blocks: 2

---

## Phase 2: Deploy and Verify

### Objective
Rebuild the `ai-agent` Docker image.

### Agent: devops_engineer
### Parallel: No

### Files to Modify
- None

### Implementation Details
- Run `docker compose up -d --build ai-agent`.

### Validation
- Ensure the container is running and healthy.

### Dependencies
- Blocked by: 1
- Blocks: None
