FROM golang:1.24.4-alpine

WORKDIR /app

# Install air (live reload tool)
RUN go install github.com/air-verse/air@latest && \
    cp /go/bin/air /usr/local/bin/air

    # Copy go.mod and install deps (optional but recommended)
COPY go.mod ./
# COPY go.sum ./
RUN go mod download


COPY . .
# RUN go build -o myserver

EXPOSE 3000
# CMD ["./myserver"]
CMD ["air"]

