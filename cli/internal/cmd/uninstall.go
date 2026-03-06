package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/output"
	"github.com/lootprotocol/lootprotocol/internal/types"
)

func newUninstallCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "uninstall <slug>",
		Short: "Uninstall an installed extension",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			slug := args[0]
			home, _ := os.UserHomeDir()

			// Scan all type directories for the slug
			for _, typeDir := range types.TypeDirs {
				dir := filepath.Join(home, ".claude", typeDir, slug)
				if info, err := os.Stat(dir); err == nil && info.IsDir() {
					if err := os.RemoveAll(dir); err != nil {
						return fmt.Errorf("failed to uninstall: %w", err)
					}
					output.PrintSuccess(fmt.Sprintf("Uninstalled %s from %s", slug, dir))
					return nil
				}
			}

			return fmt.Errorf("extension '%s' is not installed", slug)
		},
	}
}
