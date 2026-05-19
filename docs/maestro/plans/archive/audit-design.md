# Comprehensive Audit Design

## Problem Statement
The TicketRush application needs a comprehensive audit across both frontend and backend to identify UI/UX flaws and business logic bugs.

## Proposed Solution
Execute a Maestro-style code review focusing on recent changes (staged or last commit) to surface high-priority issues.

## Technical Strategy
- Use `code_reviewer` agent for deep static analysis.
- Scope review to active/recent changes to maintain context efficiency.
- Categorize findings by severity for actionable reporting.
