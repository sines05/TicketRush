---
title: "Fix AI Agent Broken Links"
created: "2026-05-12T13:45:00Z"
status: "approved"
authors: ["TechLead"]
type: "design"
design_depth: "quick"
task_complexity: "simple"
---

# Fix AI Agent Broken Links Design Document

## Problem Statement
Clicking on an `EventCard` in the chatbot redirects the user to a 404 page (non-existent URL). This happens because the mock data in `ai-agent/tools.py` uses fake slugs that do not exist in the actual application database.

## Approach
Connect the AI Agent directly to the backend API (`http://backend:8080/api/v1/events`) using `requests`. Update mapping logic in `graph.py` to support backend DTO field names (`title`, `start_time`, `banner_url`).

## Success Criteria
The chatbot returns real events, and clicking "Xem chi tiết" correctly navigates to the event detail page.
