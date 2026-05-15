---
title: "Fix LlamaGuard and UI Rendering Bug Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/226e73f3-a2a4-4b58-85ca-4dc38a5a33aa/plans/2026-05-12-fix-ui-llamaguard-design.md"
created: "2026-05-12T14:15:00Z"
status: "draft"
total_phases: 2
estimated_files: 1
task_complexity: "simple"
---

# Fix LlamaGuard and UI Rendering Bug Implementation Plan

## Phase 1: Fix LlamaGuard Mock Service

### Objective
Update `docker-compose.yml` so the `llamaguard-service` handles POST requests correctly without throwing 501 errors.

### Agent: coder
### Parallel: No

### Files to Modify
- `docker-compose.yml`
  - Replace the `command: python -m http.server 8001` under `llamaguard-service` with a custom inline Python HTTP server that accepts both GET (for the healthcheck) and POST (to mock LlamaGuard responses).
  - Use the following command:
    ```yaml
    command: >
      python3 -c "import http.server;
      class H(http.server.BaseHTTPRequestHandler):
          def do_GET(s): s.send_response(200); s.end_headers()
          def do_POST(s): s.send_response(200); s.end_headers(); s.wfile.write(b'{\"choices\":[{\"text\":\"safe\"}]}')
      http.server.HTTPServer(('', 8001), H).serve_forever()"
    ```

### Validation
- Run `docker-compose config` to ensure syntax is valid.

### Dependencies
- Blocked by: None
- Blocks: 2

---

## Phase 2: Deploy and Verify

### Objective
Rebuild the `ai-agent` image (to apply previous code changes that were missed because of lack of volume mapping) and restart the `llamaguard-service`.

### Agent: devops_engineer
### Parallel: No

### Files to Modify
- None

### Implementation Details
- Run `docker-compose up -d --build ai-agent llamaguard-service`.
- Wait a few seconds for services to start.
- Check `docker logs ticketrush-llamaguard` to ensure it started without syntax errors.

### Validation
- Verify the services are running with `docker ps | grep -E "ai-agent|llamaguard"`.

### Dependencies
- Blocked by: 1
- Blocks: None
