---
title: "LangGraph AI Agent with Hybrid Guardrails"
created: "2026-05-12T08:34:07Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# LangGraph AI Agent with Hybrid Guardrails Design Document

## Problem Statement

The current AI implementation in TicketRush is a stateless, mocked assistant using legacy LangChain patterns. It lacks contextual memory, safety guardrails, and deep integration with live business data. This results in a 'fragile' user experience where the agent may hallucinate, lose track of conversations, or potentially generate unsafe/off-topic content. To provide a 'perfect' assistant, we must transition to a robust, state-managed architecture using LangGraph that ensures safety through multi-layered guardrails and provides high-utility responses through deep integration with the system's core APIs, utilizing the efficient `gpt-4o-mini` model.

## Requirements

### Functional Requirements

1. **REQ-1 (LangGraph Workflow)**: Implement a Structured State Machine in Python using LangGraph to manage chat logic, including explicit nodes for 'Guardrails', 'Intent Classification', 'Tool Execution', and 'Response Synthesis'.
2. **REQ-2 (State Management)**: Persist conversation history and graph state in a PostgreSQL database to enable multi-turn memory.
3. **REQ-3 (Hybrid Guardrails)**: Implement a full-scope (Input/Output) guardrail system combining LlamaGuard for toxic content detection and custom programmatic validators for business logic integrity.
4. **REQ-4 (Business Integration)**: The agent must be a Read-Only assistant capable of fetching real-time data for events, user profiles, and orders via the Go backend.
5. **REQ-5 (Rich UI)**: The system must support 'Rich Interactive Components' (e.g. event cards) by having the agent return structured JSON that the React frontend renders into UI components.
6. **REQ-6 (Model Selection)**: Use the `gpt-4o-mini` model for efficient and high-quality reasoning.

### Non-Functional Requirements

1. **REQ-N1 (Security)**: Secure all internal Go-to-Python and Python-to-Go communication using a Shared Secret Key in headers.
2. **REQ-N2 (Observability)**: Implement verbose logging for the LangGraph state transitions to allow for auditing and debugging.

### Constraints

- The agent must NOT perform write actions (Booking, Profile updates) directly; it must only provide information and links.
- Must operate within the existing Docker-Compose network.

## Approach

### Selected Approach

**LangGraph State Machine with Hybrid Guardrails & Postgres Persistence**

We will refactor the `ai-agent` microservice into a robust LangGraph system. The graph will use `gpt-4o-mini` as the primary LLM. 
- **Workflow**: A Structured State Machine that routes user input through a 'Safety Node' (LlamaGuard), then to an 'Intent Classifier', then to specialized 'Tool Nodes' (reading from Go APIs), and finally through an 'Output Validator' before synthesis.
- **Memory**: We will add a PostgreSQL instance for LangGraph Checkpointing.
- **UX**: The agent will return a mix of Markdown and structured 'Component Data' (JSON) to enable rich rendering in the frontend.

### Alternatives Considered

#### Dynamic Agentic Loop (ReAct pattern)
- **Description**: A more 'free' agent that decides which tools to call in any order.
- **Rejected Because**: Harder to enforce 'perfect' logic and guardrail boundaries compared to a structured state machine.

#### Redis Memory
- **Description**: Using Redis for fast transient memory.
- **Rejected Because**: Postgres provides better durability and easier querying for long-term chat analytics and debugging of complex LangGraph states.

### Decision Matrix

| Criterion | Weight | Selected (LangGraph + PG) | Alternative (ReAct + Redis) |
|-----------|--------|---------------------------|----------------------------|
| Logic Precision | 40% | 5: Explicit control nodes | 3: Dynamic but unpredictable |
| Data Durability | 20% | 5: Postgres persistence | 3: Redis is transient |
| Safety Enforcement | 25% | 5: Integrated pre/post nodes | 4: Possible but more complex |
| Implementation Speed | 15% | 3: High setup overhead | 5: Lower complexity |
| **Weighted Total** | | **4.7** | **3.65** |

## Architecture

### Component Diagram

```text
[React Frontend] <--- WS/REST ---> [Go Backend]
      |                               |
 (Rich UI Cards)              (Auth & Proxy)
      ^                               |
      |                      [Python AI Service]
      |                      (LangGraph Orchestrator)
      |                         /     |      \
      |            [Cloud LLM]  [Postgres] [Go Internal APIs]
      |            (gpt-4o-mini) (Memory)     (Read-Only)
      |                ^
      |         [LlamaGuard 3]
```

### Data Flow

1. **Request**: Frontend sends message with user ID.
2. **Auth**: Go Backend validates user, adds `X-Internal-Secret`, and proxies to Python.
3. **Graph Start (Safety Node)**: Python sends input to LlamaGuard for toxic content detection. — *Traces To: REQ-3*
4. **Intent Node**: `gpt-4o-mini` classifies intent and retrieves session state from Postgres. — *Traces To: REQ-2*
5. **Tool Node**: Agent calls Go Backend Internal APIs to fetch live data (Events, Orders). — *Traces To: REQ-4*
6. **Synthesis Node**: Agent generates structured response (Markdown + JSON).
7. **Output Node**: Verify response against custom validators. — *Traces To: REQ-3*
8. **Return**: Structured data flows back to Frontend for rich rendering. — *Traces To: REQ-5*

### Key Interfaces

- **Agent API**: `POST /chat` { user_id, message, thread_id } — *Traces To: REQ-1*
- **Go Internal API**: `GET /api/internal/v1/*` (requires `X-Internal-Secret`) — *Traces To: REQ-N1*
- **Checkpointer Interface**: LangGraph `PostgresSaver` connection string.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1 | `devops_engineer` | No | Postgres DB setup (docker-compose), shared secret configuration, LlamaGuard 3 container integration. |
| 2 | `ml_engineer`, `prompt_engineer` | Yes | LangGraph state machine implementation, `gpt-4o-mini` integration, and 'Strict System Prompts' engineering. |
| 3 | `coder`, `api_designer` | Yes | Go Backend internal API extensions for events/orders/profile, and security header implementation. |
| 4 | `ux_designer`, `coder` | No | React Frontend 'Rich Component' rendering engine and ChatWidget enhancements. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| High Latency (Multi-Node Graph) | HIGH | HIGH | Implement streaming responses for each node transition where possible; optimize LLM calls. |
| Graph State Corruption | MEDIUM | LOW | Use robust PostgreSQL transactions via LangGraph's native checkpointer. |
| Model Cost (Multi-LLM calls) | MEDIUM | MEDIUM | Use `gpt-4o-mini` for smaller nodes and cached prompts for repetitive guardrail checks. |
| LlamaGuard Resource Usage | MEDIUM | MEDIUM | Monitor RAM/GPU usage in Docker; provide fallback to custom programmatic checks if OOM occurs. |

## Success Criteria

1. **SC-1**: Agent maintains 100% conversation continuity across multi-turn queries via Postgres persistence.
2. **SC-2**: 100% of toxic/malicious user input is blocked by the Safety Node before reaching the reasoning logic.
3. **SC-3**: The agent successfully renders an 'Event Card' (Rich UI) on the frontend when asked about a specific event.
4. **SC-4**: All internal communication is successfully authenticated via the Shared Secret Key.
