---
title: "Sync AI Agent Image URLs"
created: "2026-05-12T13:30:00Z"
status: "approved"
authors: ["TechLead"]
type: "design"
design_depth: "quick"
task_complexity: "simple"
---

# Sync AI Agent Image URLs Design Document

## Problem Statement
Event images are not appearing in the chatbot's `EventCard`. The backend database and actual models use the field `banner_url`, but the AI agent's mapping logic expects `image_url` from the tool's JSON output. Furthermore, the mock data in `tools.py` does not contain any image URLs.

## Approach
1. Update `ai-agent/tools.py` mock data to include realistic `banner_url` fields based on actual seed data.
2. Update `ai-agent/graph.py` mapping logic to prioritize `item.get("banner_url")` when populating the `image_url` property for the frontend.

## Success Criteria
The chatbot's `EventCard` successfully displays event images corresponding to the mock data.
