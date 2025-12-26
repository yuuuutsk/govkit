.PHONY: build clean run test install lint fmt

build:
	go build -o govkit ./cmd/govkit

clean:
	rm -f govkit output.html

run: build
	@echo "Usage: ./govkit <command> [args]"
	@echo ""
	@echo "Available commands:"
	@echo "  egov-viewer <path>  - e-Gov 通知書を HTML に変換"
	@echo ""
	@echo "Example:"
	@echo "  ./govkit egov-viewer /path/to/egov/directory"

test:
	go test -v ./...

lint:
	golangci-lint run

fmt:
	go fmt ./...
	goimports -w .

install: build
	cp govkit $(GOPATH)/bin/

.DEFAULT_GOAL := build
