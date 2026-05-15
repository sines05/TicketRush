---
title: "AI Chatbot Integration"
created: "2026-05-12T06:48:56Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# AI Chatbot Integration Design Document

## Problem Statement

TicketRush currently lacks an interactive, conversational interface to assist users. Users must manually navigate the platform to discover events, resolve support queries, or proceed through the booking flow. To enhance user experience, reduce support overhead, and increase booking conversion rates, we need to integrate an AI Agent chatbot. This chatbot must act as a Comprehensive Assistant capable of answering FAQs, helping with event discovery, and guiding users through the ticket purchasing process.

## Requirements

### Functional Requirements

1. **REQ-1**: The system must provide a Floating Chat Widget on the React frontend accessible across all pages.
2. **REQ-2**: The chatbot must answer user questions regarding events and policies (Support/FAQ).
3. **REQ-3**: The chatbot must assist users in discovering events and guiding them through the booking flow.
4. **REQ-4**: A new Python microservice must handle the core Agent reasoning loop and tool calling.
5. **REQ-5**: The Agent must utilize a Cloud LLM API (e.g., OpenAI, Anthropic) for natural language understanding and generation.

### Non-Functional Requirements

1. **REQ-N1**: The Chat UI must be responsive and integrate seamlessly with the existing Tailwind/Radix UI design system.
2. **REQ-N2**: The Python microservice must communicate efficiently and securely with the existing Go backend APIs to fetch data or trigger actions.

### Constraints

- The solution must integrate with the existing Go/Postgres/Redis backend without requiring a full rewrite of core business logic.
- Must handle API rate limits and token costs associated with the Cloud LLM provider gracefully.

## Approach

### Selected Approach

**Cloud LLM with Python Microservice Agent & Floating UI**

We will build a new Python microservice (using a framework like LangGraph or AutoGen) to host the core agentic loop. This service will call a Cloud LLM API (e.g., OpenAI) for reasoning. The existing Go backend will serve as an API gateway and data source for the Python agent. The React frontend will embed a persistent Floating Chat Widget to interact with the system via WebSockets or REST.
*Rationale: Decoupling the AI logic into a Python service allows us to leverage the mature Python AI ecosystem without cluttering the high-performance Go backend.*

### Alternatives Considered

#### Native Go Integration
- **Description**: Build the agent loop entirely in Go.
- **Pros**: Keeps infrastructure simple with fewer moving parts.
- **Cons**: The Go AI ecosystem is less mature than Python's for complex agent orchestration (tool calling, memory management).
- **Rejected Because**: The complexity of building robust agentic loops in Go currently outweighs the operational benefits of a single backend service.

#### Managed Agent Service
- **Description**: Embed a 3rd-party widget (e.g., Dialogflow, Voiceflow).
- **Pros**: Very fast implementation.
- **Cons**: Limits deep, custom integration with our proprietary booking flows and complex backend logic.
- **Rejected Because**: Ticket booking flows require tight coupling with our backend state which generic widgets struggle to support cleanly.

### Decision Matrix

| Criterion | Weight | Python Microservice | Native Go | Managed Service |
|-----------|--------|---------------------|-----------|-----------------|
| Extensibility (Tool integrations) | 40% | 5: Excellent ecosystem | 3: Functional but manual | 2: Limited by vendor |
| Implementation Speed | 30% | 4: Fast via Python libs | 2: Slow, build from scratch | 5: Very fast |
| Custom Booking Flow Support | 30% | 5: Full control | 5: Full control | 2: Difficult to customize |
| **Weighted Total** | | **4.7** | **3.3** | **2.9** |

## Architecture

### Component Diagram

```text
[React Frontend] <-- WebSocket/REST --> [Go Backend (API Gateway)]
      |                                        |
 (Floating Widget)                             v
                                  [Python Agent Microservice]
                                        |              |
                                        v              v
                                  [Cloud LLM]    [Go Backend APIs (DB)]
```

### Data Flow

1. User types a message in the Floating Widget.
2. The message is sent to the Go Backend.
3. Go Backend authenticates the user and proxies the request to the Python Agent.
4. Python Agent queries the Cloud LLM to understand intent.
5. If a tool call is needed (e.g., search events), the Agent calls the corresponding Go Backend API.
6. The Agent synthesizes the result and returns the final response back through the Go Backend to the Frontend.

### Key Interfaces

- **Chat API**: `POST /api/v1/chat` or `ws://.../chat` for messaging. — *Traces To: REQ-1*
- **Agent RPC/REST**: Internal endpoint for Go -> Python communication. — *Traces To: REQ-4*
- **Go Tool Calling APIs**: Internal API routes specifically formatted for the Agent to consume (e.g., `GET /internal/events/search`). — *Traces To: REQ-2, REQ-3*

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1 | `architect`, `devops_engineer` | No | Python microservice scaffold, Dockerfile, docker-compose update, Go-to-Python network routing. |
| 2 | `ml_engineer`, `coder` | Yes | Python agent logic (LangGraph/AutoGen), LLM integration, and tool definitions. |
| 3 | `api_designer`, `coder` | Yes | Go Backend API extensions for tool calling and Chat proxy endpoints. |
| 4 | `coder`, `ux_designer` | No | React Frontend Floating Chat Widget integration and WebSocket/REST client. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| High LLM Latency breaking UX | HIGH | MEDIUM | Implement streaming responses (Server-Sent Events or WebSockets) from Python -> Go -> Frontend. |
| Hallucinations providing wrong event details | HIGH | LOW | Strict system prompts, grounding responses in Go API data (RAG), and defining clear fallback "I don't know" states. |
| Unbounded API Costs | MEDIUM | MEDIUM | Implement rate limiting per user in the Go API Gateway and set strict token limits in the LLM calls. |

## Success Criteria

1. A user can open the chat widget on any page and ask a natural language question about an event.
2. The Python microservice successfully interprets the intent, calls a Go backend internal API to fetch the data, and returns an accurate answer.
3. The response is streamed or delivered to the frontend UI without significant UI blocking.