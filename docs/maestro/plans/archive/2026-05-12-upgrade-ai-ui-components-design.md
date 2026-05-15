---
title: "Upgrade AI Agent UI Components"
created: "2026-05-12T12:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Upgrade AI Agent UI Components Design Document

## Problem Statement

Currently, the TicketRush AI Agent uses a hardcoded, proof-of-concept mechanism to return UI components (specifically an `EventCard`). It blindly adds a static UI component when it detects the word "event" or when a tool is called. This prevents the frontend from displaying rich, dynamic interfaces based on actual backend data (e.g., real search results from `SearchEvents`). The system must be upgraded to dynamically generate these UI components directly from the results of tool calls so that the user sees accurate, data-driven interfaces.

## Requirements

### Functional Requirements

1. **REQ-1**: The system must dynamically generate UI components based on real data returned by tools (`SearchEvents`, `GetEventDetails`).
2. **REQ-2**: The `ui_components` state must only contain components relevant to the current conversation turn.

### Non-Functional Requirements

1. **REQ-N1**: Determinism - UI components must accurately reflect backend data without LLM hallucination.

## Approach

### Selected Approach

**Tool Output Post-Processing**

We will intercept specific tool outputs (e.g., `SearchEvents` and `GetEventDetails`) within the LangGraph execution flow. When a tool returns real data (like a JSON list of events), a post-processing function will automatically map that data to the corresponding UI component schema (e.g., mapping an event dictionary to an `EventCard` prop structure) and append it to the `ui_components` state. 

*Rationale*: This guarantees deterministic UI generation because it relies on strict programmatic mapping rather than the LLM's structural compliance, ensuring the UI always perfectly matches the actual backend data.

### Alternatives Considered

#### LLM-Driven UI Schema

- **Description**: Instructing the LLM to output UI schemas via a `render_ui` tool.
- **Rejected Because**: It is prone to hallucination and formatting errors, making the UI rendering brittle.

#### Dedicated UI Node

- **Description**: Adding a final LangGraph node to analyze state and generate UI.
- **Rejected Because**: It unnecessarily complicates the graph architecture when a simple 1:1 mapping at the tool execution level suffices.

### Decision Matrix

| Criterion | Weight | Tool Post-Processing | LLM-Driven Schema |
|-----------|--------|----------------------|-------------------|
| Deterministic Output | 60% | 5: Guaranteed exact mapping | 2: Prone to hallucinations |
| Implementation Simplicity | 40% | 4: Simple post-execution mapping | 3: Requires complex prompts |
| **Weighted Total** | | **4.6** | **2.4** |

## Architecture

### Data Flow

1. User sends message.
2. LLM decides to call `SearchEvents` tool.
3. `ToolNode` executes `SearchEvents`.
4. The tool result is parsed. If it contains event data, the mapping logic translates it into a list of `EventCard` dictionaries.
5. These dictionaries are appended to the `ui_components` list in the `AgentState`.
6. The `ui_components` list is cleared at the start of the next turn to prevent state bloat.
7. `main.py` extracts the `ui_components` and sends them in the `ChatResponse`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Implement tool output post-processing and state cleanup in `graph.py` and `tools.py`. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Schema Mismatch | HIGH | MEDIUM | Implement strict validation using safe dictionary access (`.get()`) during the mapping process. |
| State Bloat | MEDIUM | HIGH | Clear the `ui_components` state at the beginning of each new user message. |

## Success Criteria

1. Submitting a search query like "Summer Music Festival" results in the AI returning a real `EventCard` component populated with the mock data from the tool, rather than the hardcoded PoC card.
2. Tool call data perfectly matches UI component data.
