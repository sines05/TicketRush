---
title: "Fix Complaint Foreign Key and Validation Issues"
design_ref: "N/A"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 1
estimated_files: 1
task_complexity: "simple"
---

# Fix Complaint Foreign Key and Validation Issues Implementation Plan

## Plan Overview
Resolve the critical context mismatch, add status validation, and fix error handling in the complaint system.

## Phase 1: Backend Fixes in Complaint Handler

### Agent: coder
### Parallel: No

### Files to Modify
- `internal/handler/complaint_handler.go`

### Implementation Details
1. **Fix Context Retrieval**: Replace `c.GetString("user_id")` with:
   ```go
   userObj, exists := c.Get("user")
   if !exists {
       utils.SendError(c, http.StatusUnauthorized, "User not authenticated", "AUTH_REQUIRED")
       return
   }
   u := userObj.(*models.User)
   userID := u.ID
   ```
   Apply this to `CreateComplaint` and `GetMyComplaints`.
2. **Add Status Validation**: In `AdminUpdateComplaintStatus`, validate the input status against `models.ComplaintPending`, `models.ComplaintResolved`, and `models.ComplaintRejected`.
3. **Handle Parse Errors**: Ensure all UUID parsing is checked for errors and returns a 400 Bad Request if invalid.

### Validation
- `go build ./...`
- `go vet ./...`

### Dependencies
- Blocked by: None
- Blocks: None
