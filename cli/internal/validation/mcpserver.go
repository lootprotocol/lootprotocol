package validation

import (
	"encoding/json"
	"net/url"
	"strings"
)

type mcpConfig struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Transport   string   `json:"transport"`
	Command     string   `json:"command"`
	Args        []string `json:"args"`
	URL         string   `json:"url"`
}

type packageJSON struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ValidateMCPServer validates an MCP server extension archive.
func ValidateMCPServer(contents *ArchiveContents) *ValidationResult {
	var errors []ValidationError
	var warnings []ValidationWarning

	// 1. mcp.json must exist and be valid
	mcpJSON := ReadFileFromArchive(contents, "mcp.json")
	if mcpJSON == "" {
		errors = append(errors, ValidationError{
			Code:    "MISSING_FILE",
			Message: "mcp.json is required",
			Path:    "mcp.json",
		})
		return &ValidationResult{Valid: false, Errors: errors, Warnings: warnings}
	}

	var cfg mcpConfig
	if err := json.Unmarshal([]byte(mcpJSON), &cfg); err != nil {
		errors = append(errors, ValidationError{
			Code:    "INVALID_JSON",
			Message: "mcp.json contains invalid JSON",
			Path:    "mcp.json",
		})
		return &ValidationResult{Valid: false, Errors: errors, Warnings: warnings}
	}

	// Validate mcp.json schema
	if cfg.Name == "" {
		errors = append(errors, ValidationError{
			Code:    "INVALID_SCHEMA",
			Message: "mcp.json: name is required",
			Path:    "mcp.json",
		})
	}

	validTransports := map[string]bool{"stdio": true, "http": true, "sse": true}
	if !validTransports[cfg.Transport] {
		errors = append(errors, ValidationError{
			Code:    "INVALID_SCHEMA",
			Message: "mcp.json: transport must be one of: stdio, http, sse",
			Path:    "mcp.json",
		})
	} else {
		if cfg.Transport == "stdio" && cfg.Command == "" {
			errors = append(errors, ValidationError{
				Code:    "INVALID_SCHEMA",
				Message: `mcp.json: stdio transport requires "command", http/sse transport requires "url"`,
				Path:    "mcp.json",
			})
		}
		if (cfg.Transport == "http" || cfg.Transport == "sse") && cfg.URL == "" {
			errors = append(errors, ValidationError{
				Code:    "INVALID_SCHEMA",
				Message: `mcp.json: stdio transport requires "command", http/sse transport requires "url"`,
				Path:    "mcp.json",
			})
		}
		if cfg.URL != "" {
			if _, err := url.ParseRequestURI(cfg.URL); err != nil {
				errors = append(errors, ValidationError{
					Code:    "INVALID_SCHEMA",
					Message: "mcp.json: url must be a valid URL",
					Path:    "mcp.json",
				})
			}
		}
	}

	// 2. package.json or requirements.txt must exist
	hasPackageJSON := FileExistsInArchive(contents, "package.json")
	hasRequirementsTxt := FileExistsInArchive(contents, "requirements.txt")

	if !hasPackageJSON && !hasRequirementsTxt {
		errors = append(errors, ValidationError{
			Code:    "MISSING_FILE",
			Message: "Either package.json or requirements.txt is required",
		})
	}

	if hasPackageJSON {
		pkgRaw := ReadFileFromArchive(contents, "package.json")
		var pkg packageJSON
		if err := json.Unmarshal([]byte(pkgRaw), &pkg); err != nil {
			errors = append(errors, ValidationError{
				Code:    "INVALID_JSON",
				Message: "package.json contains invalid JSON",
				Path:    "package.json",
			})
		} else {
			if pkg.Name == "" {
				errors = append(errors, ValidationError{
					Code:    "INVALID_SCHEMA",
					Message: "package.json: name: String must contain at least 1 character(s)",
					Path:    "package.json",
				})
			}
			if pkg.Version == "" {
				errors = append(errors, ValidationError{
					Code:    "INVALID_SCHEMA",
					Message: "package.json: version: String must contain at least 1 character(s)",
					Path:    "package.json",
				})
			}
		}
	}

	// 3. src/ directory must exist
	if !DirExistsInArchive(contents, "src") {
		errors = append(errors, ValidationError{
			Code:    "MISSING_DIR",
			Message: "src/ directory is required with at least one source file",
			Path:    "src/",
		})
	}

	// 4. README.md must exist and be non-empty
	readme := ReadFileFromArchive(contents, "README.md")
	if readme == "" {
		errors = append(errors, ValidationError{
			Code:    "MISSING_FILE",
			Message: "README.md is required",
			Path:    "README.md",
		})
	} else if strings.TrimSpace(readme) == "" {
		errors = append(errors, ValidationError{
			Code:    "EMPTY_FILE",
			Message: "README.md must not be empty",
			Path:    "README.md",
		})
	}

	// Extract version from package.json if available
	version := "1.0.0"
	if hasPackageJSON {
		pkgRaw := ReadFileFromArchive(contents, "package.json")
		var pkg packageJSON
		if json.Unmarshal([]byte(pkgRaw), &pkg) == nil && pkg.Version != "" {
			version = pkg.Version
		}
	}

	metadata := &ExtractedMetadata{
		Name:        cfg.Name,
		Description: cfg.Description,
		Version:     version,
		Transport:   cfg.Transport,
		Readme:      readme,
	}

	valid := len(errors) == 0
	if !valid {
		metadata = nil
	}

	return &ValidationResult{
		Valid:    valid,
		Errors:   errors,
		Warnings: warnings,
		Metadata: metadata,
	}
}
