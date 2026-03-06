package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/output"
	"github.com/lootprotocol/lootprotocol/internal/types"
)

func newListCmd() *cobra.Command {
	var filterType string
	var jsonOutput bool

	cmd := &cobra.Command{
		Use:     "list",
		Aliases: []string{"ls"},
		Short:   "List installed extensions",
		RunE: func(cmd *cobra.Command, args []string) error {
			home, _ := os.UserHomeDir()
			var entries []output.InstalledEntry

			for extType, typeDir := range types.TypeDirs {
				if filterType != "" && string(extType) != filterType {
					continue
				}

				dir := filepath.Join(home, ".claude", typeDir)
				dirEntries, err := os.ReadDir(dir)
				if err != nil {
					continue // Directory doesn't exist
				}

				for _, entry := range dirEntries {
					if !entry.IsDir() {
						continue
					}
					entries = append(entries, output.InstalledEntry{
						Name:     entry.Name(),
						Type:     string(extType),
						Location: filepath.Join(dir, entry.Name()),
					})
				}
			}

			if jsonOutput {
				data, _ := json.MarshalIndent(entries, "", "  ")
				fmt.Println(string(data))
				return nil
			}

			output.PrintInstalledTable(entries)
			return nil
		},
	}

	cmd.Flags().StringVarP(&filterType, "type", "t", "", "Filter by type (skill, mcp_server, plugin)")
	cmd.Flags().BoolVar(&jsonOutput, "json", false, "Output as JSON")

	return cmd
}
