package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestConfig(t *testing.T) (string, func()) {
	t.Helper()
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")

	os.Setenv("HOME", tmpDir)
	// Clear any API URL override
	origAPIURL := os.Getenv("LOOTPROTOCOL_API_URL")
	os.Unsetenv("LOOTPROTOCOL_API_URL")

	return tmpDir, func() {
		os.Setenv("HOME", origHome)
		if origAPIURL != "" {
			os.Setenv("LOOTPROTOCOL_API_URL", origAPIURL)
		}
	}
}

func TestReadConfig_NoFile(t *testing.T) {
	_, cleanup := setupTestConfig(t)
	defer cleanup()

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Equal(t, defaultAPIURL, cfg.ApiURL)
	assert.Empty(t, cfg.AccessToken)
	assert.Nil(t, cfg.User)
}

func TestReadConfig_ExistingFile(t *testing.T) {
	tmpDir, cleanup := setupTestConfig(t)
	defer cleanup()

	dir := filepath.Join(tmpDir, ".lootprotocol")
	require.NoError(t, os.MkdirAll(dir, 0o755))

	data := Config{
		AccessToken: "test-token",
		ApiURL:      "https://custom.api.com",
		User:        &User{ID: "1", Username: "alice", DisplayName: "Alice"},
	}
	raw, _ := json.Marshal(data)
	require.NoError(t, os.WriteFile(filepath.Join(dir, "config.json"), raw, 0o644))

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Equal(t, "test-token", cfg.AccessToken)
	assert.Equal(t, "https://custom.api.com", cfg.ApiURL)
	assert.Equal(t, "alice", cfg.User.Username)
}

func TestReadConfig_EnvOverride(t *testing.T) {
	_, cleanup := setupTestConfig(t)
	defer cleanup()

	os.Setenv("LOOTPROTOCOL_API_URL", "https://env-api.com")
	defer os.Unsetenv("LOOTPROTOCOL_API_URL")

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Equal(t, "https://env-api.com", cfg.ApiURL)
}

func TestWriteConfig(t *testing.T) {
	_, cleanup := setupTestConfig(t)
	defer cleanup()

	err := WriteConfig(Config{
		AccessToken: "tok-123",
		User:        &User{ID: "1", Username: "bob", DisplayName: "Bob"},
	})
	require.NoError(t, err)

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Equal(t, "tok-123", cfg.AccessToken)
	assert.Equal(t, "bob", cfg.User.Username)
	assert.Equal(t, defaultAPIURL, cfg.ApiURL)
}

func TestWriteConfig_MergesExisting(t *testing.T) {
	_, cleanup := setupTestConfig(t)
	defer cleanup()

	// Write initial
	require.NoError(t, WriteConfig(Config{
		AccessToken: "first",
		ApiURL:      "https://api1.com",
	}))

	// Write partial update
	require.NoError(t, WriteConfig(Config{
		RefreshToken: "refresh-123",
	}))

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Equal(t, "first", cfg.AccessToken)
	assert.Equal(t, "refresh-123", cfg.RefreshToken)
	assert.Equal(t, "https://api1.com", cfg.ApiURL)
}

func TestClearConfig(t *testing.T) {
	_, cleanup := setupTestConfig(t)
	defer cleanup()

	// Write some data first
	require.NoError(t, WriteConfig(Config{
		AccessToken: "tok-123",
		User:        &User{ID: "1", Username: "bob", DisplayName: "Bob"},
	}))

	require.NoError(t, ClearConfig())

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Empty(t, cfg.AccessToken)
	assert.Empty(t, cfg.RefreshToken)
	assert.Nil(t, cfg.User)
	assert.Equal(t, defaultAPIURL, cfg.ApiURL)
}

func TestIsLoggedIn(t *testing.T) {
	assert.False(t, IsLoggedIn(Config{}))
	assert.False(t, IsLoggedIn(Config{ApiURL: "https://api.com"}))
	assert.True(t, IsLoggedIn(Config{AccessToken: "tok-123"}))
}

func TestReadConfig_InvalidJSON(t *testing.T) {
	tmpDir, cleanup := setupTestConfig(t)
	defer cleanup()

	dir := filepath.Join(tmpDir, ".lootprotocol")
	require.NoError(t, os.MkdirAll(dir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "config.json"), []byte("not json"), 0o644))

	cfg, err := ReadConfig()
	require.NoError(t, err)
	assert.Equal(t, defaultAPIURL, cfg.ApiURL)
}
