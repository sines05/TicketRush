---
title: "AI Chatbot Integration Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-12-integrate-ai-chatbot-design.md"
created: "2026-05-12T07:45:00Z"
status: "draft"
total_phases: 4
estimated_files: 13
task_complexity: "complex"
---

# AI Chatbot Integration Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: devops_engineer, ml_engineer, coder, ux_designer
- **Estimated effort**: Complex integration spanning a new Python microservice, Go backend proxy endpoints, and React frontend UI.

## Dependency Graph

```text
[Phase 1: Infrastructure]
       /        \
      v          v
[Phase 2: AI]  [Phase 3: Go API]
      \          /
       v        v
[Phase 4: Frontend UI]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Foundation, Docker, and Scaffolding |
| 2     | Phase 2, 3 | Parallel | 2 | Python AI logic and Go backend APIs |
| 3     | Phase 4 | Sequential | 1 | React UI widget |

## Phase 1: Infrastructure & Scaffolding

### Objective
Scaffold the new Python microservice, update Docker infrastructure, and define environment variables.

### Agent: devops_engineer
### Parallel: No

### Files to Create

- `ai-agent/Dockerfile` — Defines the container for the Python microservice.
- `ai-agent/requirements.txt` — Python dependencies (e.g., FastAPI, LangChain/AutoGen, Uvicorn, OpenAI).
- `ai-agent/main.py` — Entry point for the FastAPI server.

### Files to Modify

- `docker-compose.yml` — Add the new `ai-agent` service, configure networking so Go can communicate with it.
- `.env.example` — Add placeholder variables for `OPENAI_API_KEY`, `AI_AGENT_URL`, etc.

### Implementation Details
The Python microservice will run a lightweight FastAPI server on port 8000 internally. It exposes a `/chat` endpoint. The `docker-compose.yml` will ensure both `backend` and `ai-agent` are on the same network.

### Validation
- Run `docker-compose build` to ensure the new container builds successfully.
- Verify that `ai-agent` service spins up without crashing via `docker-compose up -d ai-agent`.

### Dependencies
- Blocked by: None
- Blocks: 2, 3

---

## Phase 2: Python Agent Microservice Logic

### Objective
Implement the core LLM reasoning loop, tool definitions, and API routes in the Python microservice.

### Agent: ml_engineer
### Parallel: Yes

### Files to Create

- `ai-agent/agent.py` — Core LangChain or AutoGen logic, prompt definitions, and LLM instantiation.
- `ai-agent/tools.py` — Definitions for tools that the LLM can use, pointing to the internal Go backend APIs.

### Files to Modify

- `ai-agent/main.py` — Wire the FastAPI routes to the agent reasoning functions defined in `agent.py`.

### Implementation Details
Create an agent capable of tool calling. Tools should be configured to make HTTP requests to the Go API gateway (e.g., `http://backend:8080/api/internal/...`). Define clear system prompts emphasizing the agent's role as a comprehensive assistant. 

### Validation
- Write basic Python unit tests or use a script to test the agent locally using mock tool responses.
- Ensure the FastAPI server can parse standard JSON requests and return generated LLM responses.

### Dependencies
- Blocked by: 1
- Blocks: 4

---

## Phase 3: Go Backend API Integration

### Objective
Extend the Go backend to act as a proxy for chat requests and to expose internal tool-calling endpoints for the AI agent.

### Agent: coder
### Parallel: Yes

### Files to Create

- `internal/handler/ai_proxy_handler.go` — Gin handlers for `/api/v1/chat`.
- `internal/service/ai_proxy_service.go` — Service layer to format requests and call the Python microservice.

### Files to Modify

- `internal/config/config.go` — Add `AIAgentURL` to the Go struct.
- `cmd/server/main.go` — Register the new `/api/v1/chat` routes and internal routes for the Python agent.

### Implementation Details
The new endpoints should handle user authentication context. When a chat request comes from the frontend, the Go service forwards the user's message (and potentially user context) to the Python service. It also requires internal routes (e.g., `GET /api/internal/events`) that the Python agent can query securely.

### Validation
- Run `go test ./...` to ensure no existing tests break.
- Write a Go unit test for the proxy service logic using an HTTP mock.
- Ensure `go build cmd/server/main.go` succeeds.

### Dependencies
- Blocked by: 1
- Blocks: 4

---

## Phase 4: Frontend Chat Widget Integration

### Objective
Embed a persistent Floating Chat Widget in the React app and hook it up to the Go backend.

### Agent: ux_designer
### Parallel: No

### Files to Create

- `frontend/src/components/ChatWidget.jsx` — The UI component containing the chat history, input field, and open/close toggle.
- `frontend/src/services/aiService.js` — Axios functions to communicate with the Go backend's `/api/v1/chat` endpoint.

### Files to Modify

- `frontend/src/App.jsx` — Inject the `<ChatWidget />` so it is globally available.
- `frontend/package.json` — Add UI dependencies (e.g., `lucide-react` for icons if not already present).

### Implementation Details
Use Radix UI and Tailwind CSS to create a modern, sleek floating chat interface. Handle loading states and stream/append messages to the chat history. Integrate `aiService.js` to dispatch messages to the Go backend.

### Validation
- Run `npm run lint` and `npm run build` in the `frontend/` directory to ensure build integrity.
- Manually verify (or use a placeholder test) that the component renders without errors.

### Dependencies
- Blocked by: 2, 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `docker-compose.yml` | 1 | Add AI service |
| 2 | `ai-agent/Dockerfile` | 1 | Python runtime |
| 3 | `ai-agent/requirements.txt` | 1 | Python deps |
| 4 | `ai-agent/main.py` | 1 | FastAPI entrypoint |
| 5 | `.env.example` | 1 | Add new env vars |
| 6 | `ai-agent/agent.py` | 2 | Core LLM logic |
| 7 | `ai-agent/tools.py` | 2 | Tool definitions |
| 8 | `internal/config/config.go` | 3 | Go config |
| 9 | `cmd/server/main.go` | 3 | Go routing |
| 10 | `internal/handler/ai_proxy_handler.go` | 3 | Go API handlers |
| 11 | `internal/service/ai_proxy_service.go` | 3 | Go service logic |
| 12 | `frontend/src/App.jsx` | 4 | React layout |
| 13 | `frontend/src/components/ChatWidget.jsx` | 4 | React component |
| 14 | `frontend/src/services/aiService.js` | 4 | React API service |
| 15 | `frontend/package.json` | 4 | React deps |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Basic container configuration. |
| 2     | HIGH | Core AI logic; prompt engineering and tool reliability are hard to get right on the first try. |
| 3     | MEDIUM | Touching the main Go router; risk of routing conflicts or context propagation issues. |
| 4     | LOW | standard React component development; minimal risk of breaking existing UI flows. |

## Execution Profile

```text
Execution Profile:
- Total phases: 4
- Parallelizable phases: 2 (in 1 batch)
- Sequential-only phases: 2
- Estimated parallel wall time: 10 minutes
- Estimated sequential wall time: 20 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```