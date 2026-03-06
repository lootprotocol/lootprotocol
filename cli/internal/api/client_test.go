package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lootprotocol/lootprotocol/internal/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSearchExtensions(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/extensions", r.URL.Path)
		assert.Equal(t, "test query", r.URL.Query().Get("q"))
		assert.Equal(t, "skill", r.URL.Query().Get("type"))
		assert.Equal(t, "10", r.URL.Query().Get("limit"))
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		json.NewEncoder(w).Encode(types.PaginatedResponse{
			Data: []types.Extension{{Name: "test-ext", Slug: "test-ext"}},
			Pagination: types.Pagination{Page: 1, Limit: 10, Total: 1, TotalPages: 1},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-token")
	result, err := client.SearchExtensions("test query", "", "skill", 10)
	require.NoError(t, err)
	assert.Len(t, result.Data, 1)
	assert.Equal(t, "test-ext", result.Data[0].Name)
}

func TestGetExtension(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/extensions/my-ext", r.URL.Path)
		json.NewEncoder(w).Encode(GetExtensionResponse{
			Data: types.Extension{Name: "my-ext", Slug: "my-ext", Description: "desc"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "")
	ext, err := client.GetExtension("my-ext")
	require.NoError(t, err)
	assert.Equal(t, "my-ext", ext.Name)
	assert.Equal(t, "desc", ext.Description)
}

func TestDownloadExtension(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/extensions/my-ext/download", r.URL.Path)
		assert.Equal(t, "cli", r.Header.Get("X-Download-Source"))
		assert.Equal(t, "Bearer tok", r.Header.Get("Authorization"))
		w.Write([]byte("archive-data"))
	}))
	defer server.Close()

	client := NewClient(server.URL, "tok")
	data, err := client.DownloadExtension("my-ext")
	require.NoError(t, err)
	assert.Equal(t, "archive-data", string(data))
}

func TestRequestJSON_AuthError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewClient(server.URL, "")
	_, err := client.GetExtension("test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Authentication required")
}

func TestRequestJSON_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": map[string]string{"message": "bad request"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "")
	_, err := client.GetExtension("test")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "bad request")
}

func TestExchangeCode(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/auth/token", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var body map[string]string
		json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "auth-code", body["code"])
		assert.Equal(t, "http://localhost:1234/callback", body["redirect_uri"])

		json.NewEncoder(w).Encode(ExchangeCodeResponse{
			AccessToken:  "at-123",
			RefreshToken: "rt-456",
			User: struct {
				ID          string `json:"id"`
				Username    string `json:"username"`
				DisplayName string `json:"displayName"`
			}{ID: "1", Username: "alice", DisplayName: "Alice"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "")
	result, err := client.ExchangeCode("auth-code", "http://localhost:1234/callback")
	require.NoError(t, err)
	assert.Equal(t, "at-123", result.AccessToken)
	assert.Equal(t, "rt-456", result.RefreshToken)
	assert.Equal(t, "alice", result.User.Username)
}

func TestGetMe(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/users/me", r.URL.Path)
		assert.Equal(t, "Bearer my-token", r.Header.Get("Authorization"))
		json.NewEncoder(w).Encode(GetMeResponse{
			Data: types.Profile{ID: "1", Username: "alice"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "my-token")
	profile, err := client.GetMe()
	require.NoError(t, err)
	assert.Equal(t, "alice", profile.Username)
}

func TestPublishExtension(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/extensions", r.URL.Path)
		assert.Contains(t, r.Header.Get("Content-Type"), "multipart/form-data")

		err := r.ParseMultipartForm(10 << 20)
		require.NoError(t, err)

		assert.Equal(t, "skill", r.FormValue("type"))
		assert.Equal(t, "My Extension", r.FormValue("displayName"))
		assert.Equal(t, "productivity", r.FormValue("category"))

		json.NewEncoder(w).Encode(GetExtensionResponse{
			Data: types.Extension{Name: "my-ext", Slug: "my-ext", LatestVersion: "1.0.0"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	ext, err := client.PublishExtension(
		[]byte("archive-data"),
		"ext.tar.gz",
		"skill",
		"My Extension",
		"productivity",
		[]string{"tag1"},
	)
	require.NoError(t, err)
	assert.Equal(t, "my-ext", ext.Slug)
	assert.Equal(t, "1.0.0", ext.LatestVersion)
}
