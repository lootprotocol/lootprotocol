package cmd

import (
	"github.com/spf13/cobra"
)

func newRootCmd(version string) *cobra.Command {
	rootCmd := &cobra.Command{
		Use:           "lootprotocol",
		Short:         "Loot Protocol — AI Extension Marketplace CLI",
		SilenceErrors: true,
		SilenceUsage:  true,
		Version:       version,
	}

	rootCmd.AddCommand(
		newLoginCmd(),
		newLogoutCmd(),
		newSearchCmd(),
		newInfoCmd(),
		newValidateCmd(),
		newInstallCmd(),
		newUninstallCmd(),
		newListCmd(),
		newPublishCmd(),
	)

	return rootCmd
}

// Execute runs the root command.
func Execute(version string) error {
	return newRootCmd(version).Execute()
}
