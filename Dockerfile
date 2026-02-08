# Build Stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git for go mod download
RUN apk add --no-cache git

COPY go.mod ./

# Copy source code first so we can tidy
COPY . .

# Run tidy to generate go.sum and download deps
RUN go mod tidy

# Run tests (Pure Go sqlite, capture output)
# ENV CGO_ENABLED=0
# RUN go test -v nexus-backend/internal/services > test_output.txt 2>&1 || { grep "Duplicate Insert" test_output.txt; grep "SameColumn Error" test_output.txt; grep "FAIL" test_output.txt; exit 1; }

# Build the application
RUN go build -o nexus-backend cmd/server/main.go

# Run Stage
FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/nexus-backend .

EXPOSE 8080

CMD ["./nexus-backend"]
