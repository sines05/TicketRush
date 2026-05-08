# Fix Database Migration Design Document

## Problem Statement
The recent update to the `User` model introduced an `IsOAuth` field. However, because the project uses explicit SQL migrations (via `golang-migrate`) rather than GORM's AutoMigrate, the underlying PostgreSQL table `users` lacks the corresponding column. This causes a SQL state 42703 error during Google Login. Additionally, there is a naming mismatch between GORM's default column derivation (`is_o_auth`) and the intended JSON tag (`is_oauth`).

## Requirements

### Functional Requirements
1. **REQ-1 (Schema Migration)**: A new SQL migration file must be created to add the `is_oauth` column to the `users` table.
2. **REQ-2 (Model Alignment)**: The Go model must explicitly map the struct field to the `is_oauth` column name.

### Constraints
- The migration must be compatible with PostgreSQL 15.

## Approach

### Selected Approach
**Explicit Migration & Tag Fix**
- Create `migrations/000010_add_user_is_oauth.up.sql` containing `ALTER TABLE users ADD COLUMN is_oauth BOOLEAN DEFAULT false;`.
- Create the corresponding `.down.sql` file.
- Update `internal/models/user.go` to include `column:is_oauth` in the `gorm` tag for the `IsOAuth` field.

## Agent Team
| Phase | Agent | Parallel | Deliverables |
|-------|-------|----------|--------------|
| 1 | `coder` | No | Model tag update and SQL migration files. |

## Success Criteria
1. The backend builds and runs without SQL errors during Google Login.
2. The `users` table correctly contains the `is_oauth` column.