# Fix OAuth and Docker Configuration Design

## Problem
1. `docker-compose.yml`: `GOOGLE_CLIENT_ID` and other secrets are not passed to the container.
2. `internal/handler/auth_handler.go`: OAuth callback returns raw JSON instead of redirecting to the SPA.
3. `internal/service/auth_service.go`: Hardcoded `"state"` parameter is insecure.
4. `internal/config/config.go`: Fails silently if OAuth keys are missing.
5. `.env.example`: Callback URL points to the wrong port.
6. `docker-compose.yml`: Redundant environment mappings.

## Solution
1. Use `env_file: .env` in `docker-compose.yml`.
2. Refactor callback to `c.Redirect` with a temporary token.
3. Generate and verify random state in cookies.
4. Add validation and warnings in `LoadConfig`.
5. Update docs/examples.
6. Clean up docker-compose mappings.