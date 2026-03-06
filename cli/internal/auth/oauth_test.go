package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEnvOrDefault(t *testing.T) {
	t.Setenv("TEST_AUTH_VAR", "custom-value")
	assert.Equal(t, "custom-value", envOrDefault("TEST_AUTH_VAR", "default"))
	assert.Equal(t, "default", envOrDefault("TEST_AUTH_NONEXISTENT_VAR", "default"))
}
