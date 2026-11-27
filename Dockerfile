# Production image for Learnlab: the API (app), the web server (web) and the
# content seeder (seed). The frontend and the course content are embedded in
# the web and seed binaries, so the image needs no files besides the binaries.
# One image, three commands; docker-compose.prod.yml picks one per service.
#
# Build (from the repo root, with no local hexago checkout needed):
#   docker build -t learnlab:$(git rev-parse --short HEAD) .

FROM golang:1.26-alpine AS build
WORKDIR /src
ENV CGO_ENABLED=0 GOFLAGS=-trimpath GOWORK=off
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -ldflags="-s -w" -o /out/app ./cmd/app \
 && go build -ldflags="-s -w" -o /out/web ./cmd/web \
 && go build -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -H -u 10001 learnlab
COPY --from=build /out/app /out/web /out/seed /usr/local/bin/
USER 10001
# Default command is the API; compose overrides it for web and seed.
CMD ["app"]
