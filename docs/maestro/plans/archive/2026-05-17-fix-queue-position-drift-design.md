---
title: "fix-queue-position-drift"
created: "2026-05-17T23:05:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Queue Position Drift Design Document

## Problem Statement

The virtual queue system currently exhibits a logical drift in the displayed position when a user re-enters a queue for an event they previously joined (e.g., after a successful purchase or a session reset).

The root cause is a synchronization gap between the initial HTTP handshake and the subsequent WebSocket updates. While the backend correctly increments the global queue counters, it fails to provide the "current processed index" in the initial response. Consequently, the frontend defaults its internal state to 0, causing the displayed position to appear as the raw global index (e.g., "125") rather than the relative rank (e.g., "1").

## Requirements

### Functional Requirements

1. **REQ-1**: Update the `QueueService` interface to include the current `processed_index` in the return values of `JoinQueue` and `GetStatus`.
2. **REQ-2**: Update `internal/handler/queue_handler.go` to include `current_processed_index` in the JSON response for both endpoints.
3. **REQ-3**: Update frontend `VirtualQueue.jsx` to initialize the `currentIndex` state from the API response.
4. **REQ-4**: Add a unit test to verify the synchronized counter logic.

## Approach

### Selected Approach: Synchronized Initial State Handshake

1.  **Backend Interface Update**:
    - Modify `internal/queue/service.go`: Update `JoinQueue` and `GetStatus` return signatures to include `processedIndex int64`.
    - Update `internal/queue/service.go`: In both methods, call `s.repo.GetProcessedIndex(ctx, eventID)` and return it.
2.  **Handler Update**:
    - Modify `internal/handler/queue_handler.go`: Add `"current_processed_index": processedIndex` to the JSON response map in `JoinQueue` and `GetStatus`.
3.  **Frontend State Hydration**:
    - Modify `frontend/src/pages/Booking/VirtualQueue.jsx`: Update `initQueue` to extract `res.current_processed_index` and call `setCurrentIndex(res.current_processed_index)`.
4.  **Verification**:
    - Create `internal/tests/queue_status_test.go` to verify logic.

## Architecture

### Data Flow

```
[Frontend] --(POST /queue/join)--> [QueueHandler]
                                        |
                                [QueueService.JoinQueue]
                                        |--> Get/Incr JoinIndex (Redis)
                                        |--> Get ProcessedIndex (Redis)
                                        v
[Frontend] <--(JSON {join_index, current_processed_index})-- [QueueHandler]
    |
    |-- setJoinIndex(res.join_index)
    |-- setCurrentIndex(res.current_processed_index)
    v
[UI: Position = joinIndex - currentIndex]
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Backend and Frontend synchronization fix. |
| 2     | `tester` | No       | Integration tests for queue status. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Race Condition** | LOW | LOW | Processed index drift between HTTP and WS sub is negligible and user-friendly (shifts toward 0). |
| **Backward Compatibility** | LOW | LOW | Field addition is additive. |

## Success Criteria

1. API returns `current_processed_index`.
2. Frontend relative position is correct immediately on load.
3. Tests pass.
