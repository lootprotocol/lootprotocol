package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"

	"github.com/lootprotocol/lootprotocol/internal/types"
)

// Client is an HTTP client for the Loot Protocol API.
type Client struct {
	BaseURL     string
	AccessToken string
	HTTPClient  *http.Client
}

// NewClient creates a new API client.
func NewClient(baseURL, accessToken string) *Client {
	return &Client{
		BaseURL:     baseURL,
		AccessToken: accessToken,
		HTTPClient:  &http.Client{},
	}
}

type apiError struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *Client) doRequest(req *http.Request) (*http.Response, error) {
	if c.AccessToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.AccessToken)
	}
	return c.HTTPClient.Do(req)
}

func (c *Client) requestJSON(method, path string, body io.Reader, headers map[string]string) ([]byte, error) {
	u := c.BaseURL + path
	req, err := http.NewRequest(method, u, body)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := c.doRequest(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("Authentication required. Run: lootprotocol login")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr apiError
		if json.Unmarshal(data, &apiErr) == nil && apiErr.Error.Message != "" {
			return nil, fmt.Errorf("%s", apiErr.Error.Message)
		}
		return nil, fmt.Errorf("API error: %d", resp.StatusCode)
	}

	return data, nil
}

// SearchExtensions searches for extensions with optional filters.
func (c *Client) SearchExtensions(query string, category, extType string, limit int) (*types.PaginatedResponse, error) {
	params := url.Values{}
	params.Set("q", query)
	if category != "" {
		params.Set("category", category)
	}
	if extType != "" {
		params.Set("type", extType)
	}
	if limit > 0 {
		params.Set("limit", strconv.Itoa(limit))
	}

	data, err := c.requestJSON("GET", "/extensions?"+params.Encode(), nil, nil)
	if err != nil {
		return nil, err
	}

	var result types.PaginatedResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &result, nil
}

// GetExtensionResponse wraps a single extension response.
type GetExtensionResponse struct {
	Data types.Extension `json:"data"`
}

// GetExtension fetches a single extension by slug.
func (c *Client) GetExtension(slug string) (*types.Extension, error) {
	data, err := c.requestJSON("GET", "/extensions/"+slug, nil, nil)
	if err != nil {
		return nil, err
	}

	var result GetExtensionResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &result.Data, nil
}

// DownloadExtension downloads an extension archive.
func (c *Client) DownloadExtension(slug string) ([]byte, error) {
	u := c.BaseURL + "/extensions/" + slug + "/download"
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Download-Source", "cli")

	resp, err := c.doRequest(req)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("Authentication required. Run: lootprotocol login")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.Header.Get("Content-Type") == "application/json" {
			body, _ := io.ReadAll(resp.Body)
			var apiErr apiError
			if json.Unmarshal(body, &apiErr) == nil && apiErr.Error.Message != "" {
				return nil, fmt.Errorf("%s", apiErr.Error.Message)
			}
		}
		return nil, fmt.Errorf("Download failed: %s", resp.Status)
	}

	return io.ReadAll(resp.Body)
}

// PublishExtension publishes an extension via multipart form upload.
func (c *Client) PublishExtension(archive []byte, filename, extType, displayName, category string, tags []string) (*types.Extension, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	part, err := w.CreateFormFile("archive", filename)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(archive); err != nil {
		return nil, err
	}
	w.WriteField("type", extType)
	w.WriteField("displayName", displayName)
	w.WriteField("category", category)
	tagsJSON, _ := json.Marshal(tags)
	w.WriteField("tags", string(tagsJSON))
	w.Close()

	data, err := c.requestJSON("POST", "/extensions", &buf, map[string]string{
		"Content-Type": w.FormDataContentType(),
	})
	if err != nil {
		return nil, err
	}

	var result GetExtensionResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &result.Data, nil
}

// ExchangeCodeResponse represents the response from the token exchange endpoint.
type ExchangeCodeResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"displayName"`
	} `json:"user"`
}

// ExchangeCode exchanges an authorization code for tokens.
func (c *Client) ExchangeCode(code, redirectURI string) (*ExchangeCodeResponse, error) {
	body, _ := json.Marshal(map[string]string{
		"code":         code,
		"redirect_uri": redirectURI,
	})
	data, err := c.requestJSON("POST", "/auth/token", bytes.NewReader(body), map[string]string{
		"Content-Type": "application/json",
	})
	if err != nil {
		return nil, err
	}

	var result ExchangeCodeResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &result, nil
}

// GetMeResponse wraps the profile response.
type GetMeResponse struct {
	Data types.Profile `json:"data"`
}

// GetMe fetches the authenticated user's profile.
func (c *Client) GetMe() (*types.Profile, error) {
	data, err := c.requestJSON("GET", "/auth/me", nil, nil)
	if err != nil {
		return nil, err
	}

	var result GetMeResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &result.Data, nil
}
