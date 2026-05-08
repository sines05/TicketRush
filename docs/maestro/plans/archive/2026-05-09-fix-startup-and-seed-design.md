# Fix Startup & Seeding Design

## Problem
Startup logic has vulnerabilities (race conditions in seeding) and redundancies. User wants a "Clean & Seed Always" policy.

## Solution
- Move credentials to .env.
- Consolidate migration logic.
- Modify seeder to drop schema before migrating and seeding.
- Cleanup redundant code.