package cmd

import (
	"fmt"
	"time"

	"github.com/briandowns/spinner"
	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/auth"
	"github.com/lootprotocol/lootprotocol/internal/config"
	"github.com/lootprotocol/lootprotocol/internal/output"
)

func newLoginCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "login",
		Short: "Log in to Loot Protocol",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.ReadConfig()
			if err != nil {
				return err
			}

			if config.IsLoggedIn(cfg) {
				name := "user"
				if cfg.User != nil {
					if cfg.User.DisplayName != "" {
						name = cfg.User.DisplayName
					} else if cfg.User.Username != "" {
						name = cfg.User.Username
					}
				}
				output.PrintSuccess(fmt.Sprintf("Already logged in as %s", name))
				return nil
			}

			s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
			s.Suffix = " Opening browser for authentication..."
			s.Start()

			result, err := auth.PerformLogin(cfg.ApiURL)
			s.Stop()
			if err != nil {
				return fmt.Errorf("login failed: %w", err)
			}

			name := result.User.DisplayName
			if name == "" {
				name = result.User.Username
			}
			output.PrintSuccess(fmt.Sprintf("Logged in as %s", name))
			return nil
		},
	}
}
