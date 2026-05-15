# Render Deployment Blueprint

## Background & Motivation
The objective is to deploy the TicketRush microservices architecture (Frontend, Backend, AI Agent, Postgres DBs, Redis) to Render.com using an Infrastructure as Code (IaC) approach. This ensures a reproducible, self-documenting, and easily maintainable deployment configuration.

## Scope & Impact
This plan will create a `render.yaml` file in the root of the repository. This file defines 7 interconnected resources without modifying any existing application code:
1. **ticketrush-db**: Main PostgreSQL database.
2. **ticketrush-ai-db**: Secondary PostgreSQL database for the AI agent.
3. **ticketrush-redis**: Redis cache.
4. **ticketrush-llamaguard**: Private service mocking the LlamaGuard API.
5. **ticketrush-ai-agent**: Private service for the AI agent, accessible only within Render's internal network.
6. **ticketrush-backend**: Public Web Service running the Go API.
7. **ticketrush-frontend**: Public Static Site serving the React frontend.

## Proposed Solution
We will use Render's Blueprint specification (`render.yaml`) to define the services. By utilizing Render's Private Services (`pserv`) for the AI Agent and Llamaguard, we increase security and avoid public exposure of internal APIs. Environment variables will be linked using Render's `fromService` and `fromDatabase` features wherever possible.

## Implementation Steps

1. **Create `render.yaml`**:
   Add the following content to a new `render.yaml` file in the root directory:

   ```yaml
   version: "1"

   services:
     # --- Databases & Cache ---
     - type: psql
       name: ticketrush-db
       plan: free
       postgresMajorVersion: 15

     - type: psql
       name: ticketrush-ai-db
       plan: free
       postgresMajorVersion: 15

     - type: redis
       name: ticketrush-redis
       plan: free
       maxmemoryPolicy: noeviction

     # --- Private Internal Services ---
     - type: pserv
       name: ticketrush-llamaguard
       env: python
       plan: free
       buildCommand: ""
       startCommand: "python3 -c \"import http.server; class H(http.server.BaseHTTPRequestHandler): do_GET=lambda s: (s.send_response(200), s.end_headers()); do_POST=lambda s: (s.send_response(200), s.end_headers(), s.wfile.write(b'{\\\"choices\\\":[{\\\"text\\\":\\\"safe\\\"}]}')); http.server.HTTPServer(('', 8001), H).serve_forever()\""
       envVars:
         - key: PORT
           value: "8001"

     - type: pserv
       name: ticketrush-ai-agent
       env: docker
       dockerfilePath: ./ai-agent/Dockerfile
       plan: free
       envVars:
         - key: AI_DB_URL
           fromDatabase:
             name: ticketrush-ai-db
             property: connectionString
         - key: LLAMAGUARD_URL
           value: http://ticketrush-llamaguard:8001
         - key: OPENAI_API_KEY
           sync: false # Must be set manually in Render Dashboard
         - key: X_INTERNAL_SECRET
           generateValue: true

     # --- Public Web Services ---
     - type: web
       name: ticketrush-backend
       env: docker
       dockerfilePath: ./Dockerfile.backend
       plan: free
       envVars:
         - key: DB_HOST
           fromDatabase:
             name: ticketrush-db
             property: host
         - key: DB_PORT
           fromDatabase:
             name: ticketrush-db
             property: port
         - key: DB_USER
           fromDatabase:
             name: ticketrush-db
             property: user
         - key: DB_PASSWORD
           fromDatabase:
             name: ticketrush-db
             property: password
         - key: DB_NAME
           fromDatabase:
             name: ticketrush-db
             property: database
         - key: REDIS_HOST
           fromService:
             type: redis
             name: ticketrush-redis
             property: host
         - key: REDIS_PORT
           fromService:
             type: redis
             name: ticketrush-redis
             property: port
         - key: JWT_SECRET
           generateValue: true
         - key: X_INTERNAL_SECRET
           fromService:
             type: pserv
             name: ticketrush-ai-agent
             property: X_INTERNAL_SECRET
         - key: AI_AGENT_URL
           value: http://ticketrush-ai-agent:8000
         - key: FRONTEND_URL
           sync: false # To be updated manually in Render Dashboard once frontend URL is known

     # --- Frontend Static Site ---
     - type: web
       name: ticketrush-frontend
       env: static
       plan: free
       buildCommand: npm install && npm run build
       staticPublishPath: ./dist
       rootDirectory: ./frontend
       envVars:
         - key: VITE_API_URL
           sync: false # To be updated manually in Render Dashboard once backend URL is known
         - key: VITE_USE_MOCK
           value: "false"
   ```

## Verification
- Review the `render.yaml` structure to ensure all internal dependencies and credentials align with the `docker-compose.yml` logic.
- Upon connecting the GitHub repository to Render, the Blueprint Sync will detect the `render.yaml` and provision the services.
- The user will need to manually populate `OPENAI_API_KEY`, `VITE_API_URL`, and `FRONTEND_URL` in the Render dashboard after the initial deployment provisions the hostnames.