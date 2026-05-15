---
title: "Optimize AI Agent Tool Integration"
created: "2026-05-12T15:00:00Z"
status: "approved"
authors: ["TechLead"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Optimize AI Agent Tool Integration Design Document

## Problem Statement
The AI Agent fails to return events when users ask generic queries (e.g., "cho tôi vài sự kiện") or ask for popular events (e.g., "sự kiện đang hot"). The LLM passes these generic phrases to the `SearchEvents` tool (which calls `/api/v1/events?q=...`), resulting in an empty database text search.

## Requirements

### Functional Requirements
1. **REQ-1**: The agent must be able to retrieve trending ("hot") events.
2. **REQ-2**: The agent must be able to retrieve featured or generic recommendations when the user doesn't specify a keyword.
3. **REQ-3**: The agent must correctly route the user's intent to the appropriate tool.

## Approach

### Selected Approach
**Dedicated Endpoints and Prompt Refinement**

We will expose the backend's existing `/events/trending` and `/events/featured` endpoints as new tools in `ai-agent/tools.py`. We will also refine the tool descriptions and `SYSTEM_PROMPT` to guide the LLM's tool selection logic.

*Rationale*: This aligns the LLM's capabilities with the actual backend architecture. It allows the LLM to map semantic intents ("hot", "popular", "any") to specific, optimized database queries rather than relying on a fragile text search.

### Alternatives Considered
- **Backend Query Rewriting**: Modifying the `/api/v1/events` endpoint to return trending events if the query is empty or matches generic keywords. 
  - *Rejected because*: It mixes concerns. The search endpoint should strictly perform searches. It's better to expose discrete capabilities to the LLM.

## Architecture

### Data Flow
1. **User asks**: "Cho tôi sự kiện hot"
2. **LLM Evaluation**: Reads `SYSTEM_PROMPT` and tool descriptions, maps "hot" to the `GetTrendingEvents` tool.
3. **Tool Execution**: `GetTrendingEvents` calls `http://backend:8080/api/v1/events/trending`.
4. **Data Return**: Trending events JSON is returned.
5. **UI Rendering**: The `call_model` node in `graph.py` extracts the tool output and maps it to `event_card` UI components.

## Agent Team
| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Implement new tools in `tools.py` and update `SYSTEM_PROMPT` in `prompts.py`. Update graph logic to support the new tool names. |

## Risk Assessment
| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Tool Selection Confusion | MEDIUM | LOW | Provide very clear and mutually exclusive descriptions for `SearchEvents`, `GetTrendingEvents`, and `GetFeaturedEvents` in their docstrings. |

## Success Criteria
1. Asking "Sự kiện hot" returns trending event cards.
2. Asking "Cho tôi vài sự kiện" returns featured event cards.
