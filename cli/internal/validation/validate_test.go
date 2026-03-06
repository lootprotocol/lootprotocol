package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateExtension_InvalidFormat(t *testing.T) {
	result := ValidateExtension(TypeSkill, []byte("data"), "test.rar")
	assert.False(t, result.Valid)
	assert.Equal(t, "INVALID_FORMAT", result.Errors[0].Code)
}

func TestValidateExtension_UnknownType(t *testing.T) {
	data := createZip(t, map[string]string{"file.txt": "content"})
	result := ValidateExtension("unknown", data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "UNKNOWN_TYPE", result.Errors[0].Code)
}

func TestValidateExtension_PathTraversal(t *testing.T) {
	data := createZip(t, map[string]string{
		"../etc/passwd": "bad",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "PATH_TRAVERSAL", result.Errors[0].Code)
}

func TestValidateExtension_SizeExceeded_Skill(t *testing.T) {
	data := make([]byte, 6*1024*1024)
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "SIZE_EXCEEDED", result.Errors[0].Code)
}

func TestValidateExtension_SizeExceeded_MCPServer(t *testing.T) {
	data := make([]byte, 51*1024*1024)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "SIZE_EXCEEDED", result.Errors[0].Code)
}

func TestValidateExtension_SizeExceeded_Plugin(t *testing.T) {
	data := make([]byte, 101*1024*1024)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "SIZE_EXCEEDED", result.Errors[0].Code)
}
