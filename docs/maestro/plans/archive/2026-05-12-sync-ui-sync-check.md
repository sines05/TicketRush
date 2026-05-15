---
title: "Sync AI Agent UI Components"
created: "2026-05-12T13:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "quick"
task_complexity: "simple"
---

# Sync AI Agent UI Components Design Document

## Problem Statement
The AI Agent returns UI components that do not match the frontend's expectations for type names, property keys, and data structure, resulting in plain text rendering.

## Approach
Sync backend `graph.py` mapping logic with frontend `ChatWidget.jsx` and `EventCard.jsx`. Update `tools.py` mock data to include necessary fields (slug).

## Success Criteria
Chatbot displays `EventCard` components with correct data and working redirects.
