package validation

// ExtensionType represents the type of extension for validation.
type ExtensionType string

const (
	TypeSkill     ExtensionType = "skill"
	TypeMCPServer ExtensionType = "mcp_server"
	TypePlugin    ExtensionType = "plugin"
)

// ValidationResult contains the outcome of validating an extension.
type ValidationResult struct {
	Valid    bool                 `json:"valid"`
	Errors   []ValidationError   `json:"errors"`
	Warnings []ValidationWarning `json:"warnings"`
	Metadata *ExtractedMetadata  `json:"metadata"`
}

// ValidationError represents a validation error.
type ValidationError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Path    string `json:"path,omitempty"`
}

// ValidationWarning represents a validation warning.
type ValidationWarning struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Path    string `json:"path,omitempty"`
}

// ExtractedMetadata contains metadata extracted during validation.
type ExtractedMetadata struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Version     string `json:"version,omitempty"`
	Transport   string `json:"transport,omitempty"`
	Readme      string `json:"readme,omitempty"`
}

// ArchiveContents represents the extracted contents of an archive.
type ArchiveContents struct {
	Files   map[string][]byte
	RootDir string
}
