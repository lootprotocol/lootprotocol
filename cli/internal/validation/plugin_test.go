package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validPluginFiles() map[string]string {
	return map[string]string{
		".claude-plugin/plugin.json":  `{"name":"test-plugin","version":"1.0.0","description":"A test plugin"}`,
		"skills/search/SKILL.md":      "---\ndescription: Search skill\n---\nThis is the search skill body content.",
		"README.md":                   "# Test Plugin\nA test plugin.",
	}
}

func TestValidatePlugin_Valid(t *testing.T) {
	data := createZip(t, validPluginFiles())
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "test-plugin", result.Metadata.Name)
	assert.Equal(t, "1.0.0", result.Metadata.Version)
}

func TestValidatePlugin_MissingPluginJSON(t *testing.T) {
	files := map[string]string{
		"skills/search/SKILL.md": "---\ndescription: test\n---\nThis is the skill body content.",
		"README.md":              "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "MISSING_FILE", result.Errors[0].Code)
}

func TestValidatePlugin_InvalidPluginJSON(t *testing.T) {
	files := validPluginFiles()
	files[".claude-plugin/plugin.json"] = "not json"
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "INVALID_JSON", result.Errors[0].Code)
}

func TestValidatePlugin_InvalidName(t *testing.T) {
	files := validPluginFiles()
	files[".claude-plugin/plugin.json"] = `{"name":"InvalidName","version":"1.0.0","description":"test"}`
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "INVALID_SCHEMA" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidatePlugin_WarningsOnMissingVersionDescription(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin"}`,
		"commands/run.sh":            "#!/bin/bash\necho hello",
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
	assert.Len(t, result.Warnings, 2)

	codes := make(map[string]bool)
	for _, w := range result.Warnings {
		codes[w.Code] = true
	}
	assert.True(t, codes["MISSING_VERSION"])
	assert.True(t, codes["MISSING_DESCRIPTION"])
}

func TestValidatePlugin_NoComponents(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "NO_COMPONENTS" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidatePlugin_WithMcpJSON(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		".mcp.json":                  `{"mcpServers":{}}`,
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidatePlugin_WithHooksJSON(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"hooks/hooks.json":           `{"hooks":[]}`,
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidatePlugin_InvalidHooksJSON(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"hooks/hooks.json":           "not json",
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "INVALID_JSON" && e.Path == "hooks/hooks.json" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidatePlugin_InvalidMcpJSON(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		".mcp.json":                  "not json",
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
}

func TestValidatePlugin_MissingReadme(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"commands/run.sh":            "#!/bin/bash\necho hello",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
}

func TestValidatePlugin_PathTraversalInConfig(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test","config":"../../etc/passwd"}`,
		"commands/run.sh":            "#!/bin/bash\necho hello",
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.False(t, result.Valid)
	hasErr := false
	for _, e := range result.Errors {
		if e.Code == "PATH_TRAVERSAL" {
			hasErr = true
		}
	}
	assert.True(t, hasErr)
}

func TestValidatePlugin_WithCommandsComponent(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"commands/hello.sh":          "#!/bin/bash\necho hello",
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidatePlugin_WithAgentsComponent(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"agents/agent.md":            "# Agent\nAn agent.",
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidatePlugin_WithLspJSON(t *testing.T) {
	files := map[string]string{
		".claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		".lsp.json":                  `{"servers":[]}`,
		"README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
}

func TestValidatePlugin_WithRootDir(t *testing.T) {
	files := map[string]string{
		"myplugin/.claude-plugin/plugin.json": `{"name":"test-plugin","version":"1.0.0","description":"test"}`,
		"myplugin/commands/run.sh":            "#!/bin/bash\necho hello",
		"myplugin/README.md":                  "readme",
	}
	data := createZip(t, files)
	result := ValidateExtension(TypePlugin, data, "test.zip")
	assert.True(t, result.Valid)
}
