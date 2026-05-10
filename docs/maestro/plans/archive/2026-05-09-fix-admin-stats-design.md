# Fix Admin Stats and Remove Redundancy Design

## Problem
The Admin Dashboard Stats route is mapped to an incomplete handler, and there is redundant code in `AdminDashboardHandler`.

## Solution
1. Remap the route in `main.go` to `eventHandler.GetStats`.
2. Remove the `AdminDashboardHandler` struct and its initialization.
