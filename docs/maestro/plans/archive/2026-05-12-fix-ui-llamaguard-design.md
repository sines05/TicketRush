---
title: "Fix LlamaGuard and UI Rendering Bug"
created: "2026-05-12T14:15:00Z"
status: "approved"
authors: ["TechLead"]
type: "design"
design_depth: "quick"
task_complexity: "simple"
---

# Fix LlamaGuard and UI Rendering Bug Design Document

## Problem Statement
1. `llamaguard-service` returns 501 Unsupported method (POST).
2. AI chatbot only displays plain text instead of `event_card` UI components.

## Approach
- Update `docker-compose.yml` to replace the simple GET-only HTTP server with a mock Python script that supports POST and returns a valid LlamaGuard response.
- Rebuild the `ai-agent` Docker image to apply previous code fixes.

## Success Criteria
- No 501 errors in LlamaGuard logs.
- Chatbot renders `event_card` components correctly.
