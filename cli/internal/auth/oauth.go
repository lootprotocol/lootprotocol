package auth

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/pkg/browser"

	"github.com/lootprotocol/lootprotocol/internal/api"
	"github.com/lootprotocol/lootprotocol/internal/config"
)

// defaultCognitoDomain and defaultCognitoClientID can be overridden at build time via ldflags.
var defaultCognitoDomain = "https://lootprotocol-dev.auth.us-east-1.amazoncognito.com"
var defaultCognitoClientID = ""

var (
	cognitoDomain   = envOrDefault("COGNITO_DOMAIN", defaultCognitoDomain)
	cognitoClientID = envOrDefault("COGNITO_CLIENT_ID", defaultCognitoClientID)
)

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// LoginResult contains the user info after a successful login.
type LoginResult struct {
	User config.User
}

// PerformLogin starts an OAuth2 browser-based login flow.
func PerformLogin(apiURL string) (*LoginResult, error) {
	if cognitoClientID == "" {
		return nil, fmt.Errorf("COGNITO_CLIENT_ID is not set; set it via environment variable or build with ldflags")
	}

	// Start local HTTP server on a fixed port for Cognito callback
	listener, err := net.Listen("tcp", "127.0.0.1:18432")
	if err != nil {
		return nil, fmt.Errorf("failed to start local server on port 18432: %w", err)
	}
	redirectURI := "http://localhost:18432/callback"

	resultCh := make(chan *LoginResult, 1)
	errCh := make(chan error, 1)

	mux := http.NewServeMux()
	server := &http.Server{Handler: mux}

	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing authorization code", http.StatusBadRequest)
			return
		}

		client := api.NewClient(apiURL, "")
		result, err := client.ExchangeCode(code, redirectURI)
		if err != nil {
			http.Error(w, "Authentication failed", http.StatusInternalServerError)
			errCh <- err
			return
		}

		if err := config.WriteConfig(config.Config{
			AccessToken:  result.AccessToken,
			RefreshToken: result.RefreshToken,
			User: &config.User{
				ID:          result.User.ID,
				Username:    result.User.Username,
				DisplayName: result.User.DisplayName,
			},
		}); err != nil {
			http.Error(w, "Failed to save config", http.StatusInternalServerError)
			errCh <- err
			return
		}

		w.Header().Set("Content-Type", "text/html")
		fmt.Fprint(w, `<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>Logged in!</h1><p>You can close this window and return to your terminal.</p></div></body></html>`)

		resultCh <- &LoginResult{
			User: config.User{
				ID:          result.User.ID,
				Username:    result.User.Username,
				DisplayName: result.User.DisplayName,
			},
		}
	})

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	// Build authorize URL
	authorizeURL := fmt.Sprintf(
		"%s/oauth2/authorize?response_type=code&client_id=%s&redirect_uri=%s&scope=openid+profile",
		cognitoDomain,
		url.QueryEscape(cognitoClientID),
		url.QueryEscape(redirectURI),
	)

	// Try opening browser, fallback to printing URL
	if err := browser.OpenURL(authorizeURL); err != nil {
		fmt.Printf("\nOpen this URL in your browser:\n%s\n\n", authorizeURL)
	}

	// Wait with 5-minute timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	select {
	case result := <-resultCh:
		server.Shutdown(context.Background())
		return result, nil
	case err := <-errCh:
		server.Shutdown(context.Background())
		return nil, err
	case <-ctx.Done():
		server.Shutdown(context.Background())
		return nil, fmt.Errorf("login timed out after 5 minutes")
	}
}
