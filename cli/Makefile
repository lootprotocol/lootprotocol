VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
DATE    ?= $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
BINARY  := lootprotocol

LDFLAGS := -s -w \
	-X main.version=$(VERSION) \
	-X main.commit=$(COMMIT) \
	-X main.date=$(DATE)

ifdef COGNITO_DOMAIN
LDFLAGS += -X 'github.com/lootprotocol/lootprotocol/internal/auth.defaultCognitoDomain=$(COGNITO_DOMAIN)'
endif
ifdef COGNITO_CLIENT_ID
LDFLAGS += -X 'github.com/lootprotocol/lootprotocol/internal/auth.defaultCognitoClientID=$(COGNITO_CLIENT_ID)'
endif
ifdef API_URL
LDFLAGS += -X 'github.com/lootprotocol/lootprotocol/internal/config.defaultAPIURL=$(API_URL)'
endif

.PHONY: build test lint install clean

build:
	go build -ldflags "$(LDFLAGS)" -o $(BINARY) ./cmd/lootprotocol

test:
	go test -race -coverprofile=coverage.out ./...

lint:
	go vet ./...

install:
	go install -ldflags "$(LDFLAGS)" ./cmd/lootprotocol

clean:
	rm -f $(BINARY) coverage.out
