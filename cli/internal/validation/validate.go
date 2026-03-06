package validation

import (
	"fmt"
	"strings"
)

// MaxSize maps extension types to their maximum archive size in bytes.
var MaxSize = map[ExtensionType]int{
	TypeSkill:     5 * 1024 * 1024,   // 5MB
	TypeMCPServer: 50 * 1024 * 1024,  // 50MB
	TypePlugin:    100 * 1024 * 1024,  // 100MB
}

// ValidateExtension performs full validation of an extension archive.
func ValidateExtension(extType ExtensionType, archiveData []byte, filename string) *ValidationResult {
	// 1. Check archive format
	if !strings.HasSuffix(filename, ".zip") &&
		!strings.HasSuffix(filename, ".tar.gz") &&
		!strings.HasSuffix(filename, ".tgz") {
		return &ValidationResult{
			Valid: false,
			Errors: []ValidationError{
				{Code: "INVALID_FORMAT", Message: "Archive must be .zip or .tar.gz"},
			},
		}
	}

	// 2. Check size limit per type
	maxBytes, ok := MaxSize[extType]
	if !ok {
		return &ValidationResult{
			Valid: false,
			Errors: []ValidationError{
				{Code: "UNKNOWN_TYPE", Message: fmt.Sprintf("Unknown extension type: %s", extType)},
			},
		}
	}

	if sizeErr := CheckArchiveSize(archiveData, maxBytes); sizeErr != nil {
		return &ValidationResult{
			Valid:  false,
			Errors: []ValidationError{*sizeErr},
		}
	}

	// 3. Extract archive
	contents, err := ExtractArchive(archiveData, filename)
	if err != nil {
		return &ValidationResult{
			Valid: false,
			Errors: []ValidationError{
				{Code: "EXTRACT_FAILED", Message: fmt.Sprintf("Failed to extract archive: %s", err.Error())},
			},
		}
	}

	// 4. Check path traversal
	if pathErr := CheckPathTraversal(contents.Files); pathErr != nil {
		return &ValidationResult{
			Valid:  false,
			Errors: []ValidationError{*pathErr},
		}
	}

	// 5. Delegate to type-specific validator
	switch extType {
	case TypeSkill:
		return ValidateSkill(contents)
	case TypeMCPServer:
		return ValidateMCPServer(contents)
	case TypePlugin:
		return ValidatePlugin(contents)
	default:
		return &ValidationResult{
			Valid: false,
			Errors: []ValidationError{
				{Code: "UNKNOWN_TYPE", Message: fmt.Sprintf("Unknown extension type: %s", extType)},
			},
		}
	}
}
