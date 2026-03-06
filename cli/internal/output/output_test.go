package output

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTruncate(t *testing.T) {
	assert.Equal(t, "hello", Truncate("hello", 10))
	assert.Equal(t, "hel...", Truncate("hello world", 6))
	assert.Equal(t, "hello world", Truncate("hello world", 100))
	assert.Equal(t, "ab", Truncate("abcde", 2))
}

func TestCyan(t *testing.T) {
	result := Cyan("test")
	assert.Contains(t, result, "test")
}

func TestBold(t *testing.T) {
	result := Bold("test")
	assert.Contains(t, result, "test")
}

func TestGray(t *testing.T) {
	result := Gray("test")
	assert.Contains(t, result, "test")
}
