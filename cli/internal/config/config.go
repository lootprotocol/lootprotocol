package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const defaultAPIURL = "https://lootprotocol.com/api"

// User represents the authenticated user stored in config.
type User struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

// Config represents the CLI configuration stored at ~/.lootprotocol/config.json.
type Config struct {
	AccessToken  string `json:"accessToken,omitempty"`
	RefreshToken string `json:"refreshToken,omitempty"`
	ApiURL       string `json:"apiUrl"`
	User         *User  `json:"user,omitempty"`
}

func configDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".lootprotocol")
}

func configPath() string {
	return filepath.Join(configDir(), "config.json")
}

func defaults() Config {
	apiURL := os.Getenv("LOOTPROTOCOL_API_URL")
	if apiURL == "" {
		apiURL = defaultAPIURL
	}
	return Config{ApiURL: apiURL}
}

// ReadConfig reads the config file, merging with defaults.
func ReadConfig() (Config, error) {
	def := defaults()
	data, err := os.ReadFile(configPath())
	if err != nil {
		return def, nil
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return def, nil
	}
	// Merge defaults: if ApiURL is empty in file, use default
	if cfg.ApiURL == "" {
		cfg.ApiURL = def.ApiURL
	}
	return cfg, nil
}

// WriteConfig merges partial config with existing and writes to disk.
func WriteConfig(partial Config) error {
	existing, _ := ReadConfig()

	if partial.AccessToken != "" {
		existing.AccessToken = partial.AccessToken
	}
	if partial.RefreshToken != "" {
		existing.RefreshToken = partial.RefreshToken
	}
	if partial.ApiURL != "" {
		existing.ApiURL = partial.ApiURL
	}
	if partial.User != nil {
		existing.User = partial.User
	}

	if err := os.MkdirAll(configDir(), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(existing, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath(), data, 0o644)
}

// ClearConfig resets config to defaults.
func ClearConfig() error {
	def := defaults()
	if err := os.MkdirAll(configDir(), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(def, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath(), data, 0o644)
}

// IsLoggedIn returns true if an access token is present.
func IsLoggedIn(cfg Config) bool {
	return cfg.AccessToken != ""
}
