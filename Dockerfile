# Stage 1: Build
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go

# Stage 2: Runtime
FROM alpine:latest

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .
# Copy migrations for startup
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
