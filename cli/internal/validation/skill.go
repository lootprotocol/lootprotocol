package validation

import (
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

var nameRegex = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

type skillFrontmatter struct {
	Description string `yaml:"description"`
	Name        string `yaml:"name"`
	Version     string `yaml:"version"`
}

// ValidateSkill validates a skill extension archive.
func ValidateSkill(contents *ArchiveContents) *ValidationResult {
	var errors []ValidationError
	var warnings []ValidationWarning

	// 1. Check SKILL.md exists
	skillMd := ReadFileFromArchive(contents, "SKILL.md")
	if skillMd == "" {
		errors = append(errors, ValidationError{
			Code:    "MISSING_FILE",
			Message: "SKILL.md is required at the root of the archive",
			Path:    "SKILL.md",
		})
		return &ValidationResult{Valid: false, Errors: errors, Warnings: warnings}
	}

	// 2. Parse frontmatter
	fm, body, err := parseSkillFrontmatter(skillMd)
	if err != "" {
		errors = append(errors, ValidationError{
			Code:    "INVALID_FRONTMATTER",
			Message: "Failed to parse YAML frontmatter: " + err,
			Path:    "SKILL.md",
		})
		return &ValidationResult{Valid: false, Errors: errors, Warnings: warnings}
	}

	// 3. Validate frontmatter fields
	if fm.Description == "" {
		errors = append(errors, ValidationError{
			Code:    "INVALID_FRONTMATTER",
			Message: "Frontmatter: description: description must be non-empty",
			Path:    "SKILL.md",
		})
	}

	if fm.Name != "" {
		if !nameRegex.MatchString(fm.Name) {
			errors = append(errors, ValidationError{
				Code:    "INVALID_FRONTMATTER",
				Message: "Frontmatter: name: name must be lowercase with hyphens only",
				Path:    "SKILL.md",
			})
		}
		if len(fm.Name) > 64 {
			errors = append(errors, ValidationError{
				Code:    "INVALID_FRONTMATTER",
				Message: "Frontmatter: name: name must be at most 64 characters",
				Path:    "SKILL.md",
			})
		}
	}

	// 4. Check body is non-empty (at least 10 chars)
	trimmedBody := strings.TrimSpace(body)
	if len(trimmedBody) < 10 {
		errors = append(errors, ValidationError{
			Code:    "EMPTY_BODY",
			Message: "SKILL.md body must contain at least 10 characters of instructions",
			Path:    "SKILL.md",
		})
	}

	// 5. Extract metadata
	name := fm.Name
	if name == "" {
		name = deriveNameFromArchive(contents)
	}
	version := fm.Version
	if version == "" {
		version = "1.0.0"
	}

	metadata := &ExtractedMetadata{
		Name:        name,
		Description: fm.Description,
		Version:     version,
		Readme:      skillMd,
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

// parseSkillFrontmatter parses YAML frontmatter from SKILL.md content.
// Returns the parsed frontmatter, the body content, and an error string.
func parseSkillFrontmatter(content string) (skillFrontmatter, string, string) {
	var fm skillFrontmatter

	trimmed := strings.TrimSpace(content)
	if !strings.HasPrefix(trimmed, "---") {
		// No frontmatter, treat entire content as body
		return fm, content, ""
	}

	// Find the closing ---
	rest := trimmed[3:]
	idx := strings.Index(rest, "\n---")
	if idx == -1 {
		return fm, content, "missing closing --- delimiter"
	}

	yamlContent := rest[:idx]
	body := rest[idx+4:] // skip \n---

	if err := yaml.Unmarshal([]byte(yamlContent), &fm); err != nil {
		return fm, body, err.Error()
	}

	return fm, body, ""
}

func deriveNameFromArchive(contents *ArchiveContents) string {
	if contents.RootDir != "" {
		name := strings.ToLower(contents.RootDir)
		reg := regexp.MustCompile(`[^a-z0-9-]`)
		return reg.ReplaceAllString(name, "-")
	}
	return "unnamed-skill"
}
