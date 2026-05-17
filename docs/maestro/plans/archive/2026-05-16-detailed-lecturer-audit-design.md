---
title: "ticketrush-lecturer-audit"
created: "2026-05-16T16:25:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# TicketRush Lecturer Audit Design Document

## Problem Statement

The project requires a deep, pedantic audit of the TicketRush backend to ensure it strictly meets the academic requirements of the INT3306 course and stands up to intense scrutiny from a lecturer. The audit must aggressively identify flaws, edge cases, security vulnerabilities, and architectural violations that could result in point deductions.

Key areas of concern derived from the `REQUIREMENT.md` include:
1. **Database Concurrency & Transaction Isolation (4.2)**: Ensuring zero race conditions during the critical "Click to lock" seat reservation flow under high contention.
2. **Ticket Lifecycle & Background Workers (4.3)**: Validating the robust expiration of 10-minute seat locks and proper resource cleanup.
3. **Virtual Queue Architecture (4.4)**: Checking the fairness, security, and true load-shedding capabilities of the queuing system.
4. **Security & Authentication (Grading criteria 7)**: Auditing JWT flows, 2FA implementations, Role-Based Access Control (RBAC), and session management.
5. **Code Style & Architecture (Grading criteria 5 & 9)**: Evaluating adherence to SOLID principles, separation of concerns, and proper database abstraction (repository pattern).

## Approach

### Selected Approach

**Multi-Agent Specialized Audit**

We will divide the audit into specialized domains and assign expert subagents to scrutinize each area independently. This ensures that domain-specific nuances (like Postgres row-level lock behavior or JWT side-channel attacks) are caught by an agent with that specific methodology. 

### Alternatives Considered

#### Single-Pass Generalist Review
- **Description**: A single agent reads all code and looks for general flaws.
- **Rejected Because**: The user explicitly requested a "deep" and "pedantic" audit to anticipate a lecturer's strict scrutiny. A generalist approach risks missing nuanced vulnerabilities.

#### Test-Driven Audit
- **Description**: Write Go test suites (concurrency load tests, unit tests) and run them to empirically prove flaws.
- **Rejected Because**: The primary goal is a comprehensive report on the business logic flaws across the *entire* app, not just proving a single bug. We can use targeted tests later if an assumption needs verification.

### Decision Matrix

| Criterion | Weight | Multi-Agent Specialized Audit | Single-Pass Review | Test-Driven Audit |
|-----------|--------|-------------------------------|--------------------|-------------------|
| **Depth of Scrutiny** | 40% | 5: Deep domain expertise | 3: May miss subtle flaws | 4: Excellent proof, narrow scope |
| **Requirement Coverage** | 40% | 5: Can assign specific agents | 4: Covers all, shallowly | 2: Focuses heavily on testable logic |
| **Speed/Efficiency** | 20% | 3: Takes multiple agent turns | 5: Very fast | 1: Very slow |
| **Weighted Total** | | **4.6** | 3.8 | 2.6 |

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `database_administrator` | Yes | Concurrency & Database Audit Report |
| 1     | `security_engineer` | Yes | Security, JWT, RBAC Audit Report |
| 1     | `architect` | Yes | Architecture & SOLID Audit Report |
| 2     | `code_reviewer` | No | Edge Cases & Edge Bug Report |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **False Positives in Concurrency Analysis** | MEDIUM | HIGH | Orchestrator will manually review complex SQL/GORM findings before finalizing the report. |
| **Missing Context on Frontend Coupling** | LOW | MEDIUM | Audit will explicitly check WebSocket broadcasting logic to ensure it emits correct state. |
| **Token Limit Exhaustion** | MEDIUM | LOW | Agents will be assigned strictly scoped directories to analyze. |

## Success Criteria

1. A comprehensive, severity-classified report detailing potential lecturer criticisms is produced.
2. The report directly addresses grading criteria from `REQUIREMENT.md`.
