package types

// ExtensionType represents the type of extension.
type ExtensionType string

const (
	ExtensionTypeSkill     ExtensionType = "skill"
	ExtensionTypeMCPServer ExtensionType = "mcp_server"
	ExtensionTypePlugin    ExtensionType = "plugin"
)

// Extension represents an extension from the marketplace.
type Extension struct {
	ID            string        `json:"id"`
	Slug          string        `json:"slug"`
	Name          string        `json:"name"`
	DisplayName   *string       `json:"displayName"`
	Description   string        `json:"description"`
	ExtensionType ExtensionType `json:"extensionType"`
	Category      string        `json:"category"`
	Tags          []string      `json:"tags"`
	LatestVersion string        `json:"latestVersion"`
	ReadmeHTML    *string       `json:"readmeHtml"`
	ReadmeText    *string       `json:"readmeText"`
	DownloadCount int           `json:"downloadCount"`
	PublisherID   string        `json:"publisherId"`
	Publisher     *Profile      `json:"publisher,omitempty"`
	IsPublished   bool          `json:"isPublished"`
	IsFeatured    bool          `json:"isFeatured"`
	CreatedAt     string        `json:"createdAt"`
	UpdatedAt     string        `json:"updatedAt"`
}

// GetDisplayName returns the display name or falls back to the name.
func (e Extension) GetDisplayName() string {
	if e.DisplayName != nil && *e.DisplayName != "" {
		return *e.DisplayName
	}
	return e.Name
}

// ExtensionVersion represents a specific version of an extension.
type ExtensionVersion struct {
	ID               string                 `json:"id"`
	ExtensionID      string                 `json:"extensionId"`
	Version          string                 `json:"version"`
	S3Key            string                 `json:"s3Key"`
	PackageSizeBytes int64                  `json:"packageSizeBytes"`
	Metadata         map[string]interface{} `json:"metadata"`
	Changelog        *string                `json:"changelog"`
	DownloadCount    int                    `json:"downloadCount"`
	CreatedAt        string                 `json:"createdAt"`
}

// Pagination represents pagination info in API responses.
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// PaginatedResponse wraps a paginated API response.
type PaginatedResponse struct {
	Data       []Extension `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

// Profile represents a user profile.
type Profile struct {
	ID             string  `json:"id"`
	CognitoSub     string  `json:"cognitoSub"`
	Username       string  `json:"username"`
	Email          *string `json:"email"`
	AuthProvider   string  `json:"authProvider"`
	GithubUsername *string `json:"githubUsername"`
	GithubID       *int    `json:"githubId"`
	GoogleID       *string `json:"googleId"`
	DisplayName    *string `json:"displayName"`
	AvatarURL      *string `json:"avatarUrl"`
	Bio            *string `json:"bio"`
	WebsiteURL     *string `json:"websiteUrl"`
	Role           string  `json:"role"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}

// MarketplaceEntry represents an extension entry in the marketplace manifest.
type MarketplaceEntry struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Version     string `json:"version"`
	DownloadURL string `json:"downloadUrl"`
	Publisher   string `json:"publisher"`
	Tags        []string `json:"tags"`
}

// TypeDirs maps extension types to their installation directory names.
var TypeDirs = map[ExtensionType]string{
	ExtensionTypeSkill:     "skills",
	ExtensionTypeMCPServer: "mcp-servers",
	ExtensionTypePlugin:    "plugins",
}
