package cmd

import (
	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/config"
	"github.com/lootprotocol/lootprotocol/internal/output"
)

func newLogoutCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "logout",
		Short: "Log out of Loot Protocol",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.ReadConfig()
			if err != nil {
				return err
			}

			if !config.IsLoggedIn(cfg) {
				output.PrintWarning("You are not logged in.")
				return nil
			}

			if err := config.ClearConfig(); err != nil {
				return err
			}

			output.PrintSuccess("Logged out successfully.")
			return nil
		},
	}
}
