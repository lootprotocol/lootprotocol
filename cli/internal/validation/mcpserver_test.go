package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validMCPServerFiles() map[string]string {
	return map[string]string{
		"mcp.json":        `{"name":"test-mcp","transport":"stdio","command":"node"}`,
		"package.json":    `{"name":"test-mcp","version":"1.0.0"}`,
		"src/index.ts":    "console.log('hello');",
		"README.md":       "# Test MCP Server\nA test server.",
	}
}

func TestValidateMCPServer_Valid(t *testing.T) {
	data := createZip(t, validMCPServerFiles())
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "test-mcp", result.Metadata.Name)
	assert.Equal(t, "1.0.0", result.Metadata.Version)
}

func TestValidateMCPServer_ValidHTTPTransport(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = `{"name":"test-mcp","transport":"http","url":"https://example.com/mcp"}`
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidateMCPServer_ValidSSETransport(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = `{"name":"test-mcp","transport":"sse","url":"https://example.com/sse"}`
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidateMCPServer_MissingMcpJSON(t *testing.T) {
	files := validMCPServerFiles()
	delete(files, "mcp.json")
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "MISSING_FILE", result.Errors[0].Code)
}

func TestValidateMCPServer_InvalidMcpJSON(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = "not json"
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "INVALID_JSON", result.Errors[0].Code)
}

func TestValidateMCPServer_MissingName(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = `{"transport":"stdio","command":"node"}`
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "INVALID_SCHEMA" && e.Path == "mcp.json" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidateMCPServer_StdioMissingCommand(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = `{"name":"test","transport":"stdio"}`
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
}

func TestValidateMCPServer_HTTPMissingURL(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = `{"name":"test","transport":"http"}`
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
}

func TestValidateMCPServer_InvalidTransport(t *testing.T) {
	files := validMCPServerFiles()
	files["mcp.json"] = `{"name":"test","transport":"websocket"}`
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
}

func TestValidateMCPServer_MissingPackageAndRequirements(t *testing.T) {
	files := map[string]string{
		"mcp.json":     `{"name":"test","transport":"stdio","command":"node"}`,
		"src/index.ts": "code",
		"README.md":    "readme content",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "MISSING_FILE" && e.Message == "Either package.json or requirements.txt is required" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidateMCPServer_RequirementsTxtAlternative(t *testing.T) {
	files := map[string]string{
		"mcp.json":         `{"name":"test","transport":"stdio","command":"python"}`,
		"requirements.txt": "flask\n",
		"src/main.py":      "print('hello')",
		"README.md":        "readme content",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidateMCPServer_MissingSrcDir(t *testing.T) {
	files := map[string]string{
		"mcp.json":     `{"name":"test","transport":"stdio","command":"node"}`,
		"package.json": `{"name":"test","version":"1.0.0"}`,
		"README.md":    "readme content",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "MISSING_DIR" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidateMCPServer_MissingReadme(t *testing.T) {
	files := validMCPServerFiles()
	delete(files, "README.md")
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "MISSING_FILE" && e.Path == "README.md" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidateMCPServer_EmptyReadme(t *testing.T) {
	files := validMCPServerFiles()
	files["README.md"] = "   "
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "EMPTY_FILE" && e.Path == "README.md" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidateMCPServer_WithRootDir(t *testing.T) {
	files := map[string]string{
		"myext/mcp.json":     `{"name":"test","transport":"stdio","command":"node"}`,
		"myext/package.json": `{"name":"test","version":"2.0.0"}`,
		"myext/src/index.ts": "code",
		"myext/README.md":    "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypeMCPServer, data, "test.zip")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "2.0.0", result.Metadata.Version)
}
