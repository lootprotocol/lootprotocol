package validation

import (
	"encoding/json"
	"regexp"
	"strings"
)

var kebabCaseRegex = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

type pluginConfig struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
}

// ValidatePlugin validates a plugin extension archive.
func ValidatePlugin(contents *ArchiveContents) *ValidationResult {
	var errors []ValidationError
	var warnings []ValidationWarning

	// 1. .claude-plugin/plugin.json must exist
	pluginJSON := ReadFileFromArchive(contents, ".claude-plugin/plugin.json")
	if pluginJSON == "" {
		errors = append(errors, ValidationError{
			Code:    "MISSING_FILE",
			Message: ".claude-plugin/plugin.json is required",
			Path:    ".claude-plugin/plugin.json",
		})
		return &ValidationResult{Valid: false, Errors: errors, Warnings: warnings}
	}

	var cfg pluginConfig
	if err := json.Unmarshal([]byte(pluginJSON), &cfg); err != nil {
		errors = append(errors, ValidationError{
			Code:    "INVALID_JSON",
			Message: ".claude-plugin/plugin.json contains invalid JSON",
			Path:    ".claude-plugin/plugin.json",
		})
		return &ValidationResult{Valid: false, Errors: errors, Warnings: warnings}
	}

	// Validate plugin.json schema
	if !kebabCaseRegex.MatchString(cfg.Name) {
		errors = append(errors, ValidationError{
			Code:    "INVALID_SCHEMA",
			Message: "plugin.json: name must be kebab-case",
			Path:    ".claude-plugin/plugin.json",
		})
	}

	// Warn if version/description missing
	if cfg.Version == "" {
		warnings = append(warnings, ValidationWarning{
			Code:    "MISSING_VERSION",
			Message: "version in plugin.json is recommended",
			Path:    ".claude-plugin/plugin.json",
		})
	}
	if cfg.Description == "" {
		warnings = append(warnings, ValidationWarning{
			Code:    "MISSING_DESCRIPTION",
			Message: "description in plugin.json is recommended",
			Path:    ".claude-plugin/plugin.json",
		})
	}

	// 2. Must have at least one component
	hasSkills := DirExistsInArchive(contents, "skills")
	hasCommands := DirExistsInArchive(contents, "commands")
	hasAgents := DirExistsInArchive(contents, "agents")
	hasHooks := FileExistsInArchive(contents, "hooks/hooks.json")
	hasMcp := FileExistsInArchive(contents, ".mcp.json")
	hasLsp := FileExistsInArchive(contents, ".lsp.json")

	if !hasSkills && !hasCommands && !hasAgents && !hasHooks && !hasMcp && !hasLsp {
		errors = append(errors, ValidationError{
			Code:    "NO_COMPONENTS",
			Message: "Plugin must contain at least one component: skills/, commands/, agents/, hooks/, .mcp.json, or .lsp.json",
		})
	}

	// 3. Validate each skill if present
	if hasSkills {
		skillDirs := findSkillDirs(contents)
		for _, skillDir := range skillDirs {
			skillContents := extractSubArchive(contents, skillDir)
			skillResult := ValidateSkill(skillContents)
			if !skillResult.Valid {
				for _, e := range skillResult.Errors {
					path := skillDir + "/" + e.Path
					if e.Path == "" {
						path = skillDir
					}
					errors = append(errors, ValidationError{
						Code:    e.Code,
						Message: e.Message,
						Path:    path,
					})
				}
			}
		}
	}

	// 4. Validate hooks/hooks.json if present
	if hasHooks {
		hooksRaw := ReadFileFromArchive(contents, "hooks/hooks.json")
		var dummy interface{}
		if json.Unmarshal([]byte(hooksRaw), &dummy) != nil {
			errors = append(errors, ValidationError{
				Code:    "INVALID_JSON",
				Message: "hooks/hooks.json contains invalid JSON",
				Path:    "hooks/hooks.json",
			})
		}
	}

	// 5. Validate .mcp.json if present
	if hasMcp {
		mcpRaw := ReadFileFromArchive(contents, ".mcp.json")
		var dummy interface{}
		if json.Unmarshal([]byte(mcpRaw), &dummy) != nil {
			errors = append(errors, ValidationError{
				Code:    "INVALID_JSON",
				Message: ".mcp.json contains invalid JSON",
				Path:    ".mcp.json",
			})
		}
	}

	// 6. README.md must exist
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

	// 7. Check path safety in plugin.json
	var rawConfig map[string]interface{}
	if json.Unmarshal([]byte(pluginJSON), &rawConfig) == nil {
		checkPluginPaths(rawConfig, &errors)
	}

	metadata := &ExtractedMetadata{
		Name:        cfg.Name,
		Description: cfg.Description,
		Version:     cfg.Version,
		Readme:      readme,
	}
	if metadata.Version == "" {
		metadata.Version = "1.0.0"
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

func findSkillDirs(contents *ArchiveContents) []string {
	skillFiles := GetFilesInDir(contents, "skills")
	dirs := make(map[string]bool)
	for _, file := range skillFiles {
		parts := strings.Split(file, "/")
		if len(parts) >= 3 && parts[len(parts)-1] == "SKILL.md" {
			dir := strings.Join(parts[:len(parts)-1], "/")
			dirs[dir] = true
		}
	}
	result := make([]string, 0, len(dirs))
	for d := range dirs {
		result = append(result, d)
	}
	return result
}

func extractSubArchive(contents *ArchiveContents, dirPath string) *ArchiveContents {
	prefix := dirPath
	if !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}
	files := make(map[string][]byte)

	for filePath, data := range contents.Files {
		var relativePath string
		if strings.HasPrefix(filePath, prefix) {
			relativePath = filePath[len(prefix):]
		} else if contents.RootDir != "" && strings.HasPrefix(filePath, contents.RootDir+"/"+prefix) {
			relativePath = filePath[len(contents.RootDir+"/"+prefix):]
		} else {
			continue
		}
		if relativePath != "" {
			files[relativePath] = data
		}
	}

	return &ArchiveContents{Files: files, RootDir: ""}
}

func checkPluginPaths(config map[string]interface{}, errors *[]ValidationError) {
	for key, value := range config {
		if s, ok := value.(string); ok {
			if strings.Contains(s, "/") || strings.HasSuffix(s, ".json") || strings.HasSuffix(s, ".md") {
				if strings.Contains(s, "..") {
					*errors = append(*errors, ValidationError{
						Code:    "PATH_TRAVERSAL",
						Message: "Path traversal detected in plugin.json: " + key + `="` + s + `"`,
						Path:    ".claude-plugin/plugin.json",
					})
				}
			}
		}
		if m, ok := value.(map[string]interface{}); ok {
			checkPluginPaths(m, errors)
		}
	}
}
