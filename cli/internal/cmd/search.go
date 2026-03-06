package cmd

import (
	"fmt"
	"time"

	"github.com/briandowns/spinner"
	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/api"
	"github.com/lootprotocol/lootprotocol/internal/config"
	"github.com/lootprotocol/lootprotocol/internal/output"
)

func newSearchCmd() *cobra.Command {
	var category string
	var extType string
	var limit int

	cmd := &cobra.Command{
		Use:   "search <query>",
		Short: "Search for extensions on Loot Protocol",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			query := args[0]

			cfg, err := config.ReadConfig()
			if err != nil {
				return err
			}

			client := api.NewClient(cfg.ApiURL, cfg.AccessToken)

			s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
			s.Suffix = " Searching..."
			s.Start()

			result, err := client.SearchExtensions(query, category, extType, limit)
			s.Stop()
			if err != nil {
				return err
			}

			output.PrintExtensionTable(result.Data)

			if result.Pagination.Total > len(result.Data) {
				fmt.Printf("\nShowing %d of %d results.\n", len(result.Data), result.Pagination.Total)
			}

			return nil
		},
	}

	cmd.Flags().StringVarP(&category, "category", "c", "", "Filter by category")
	cmd.Flags().StringVarP(&extType, "type", "t", "", "Filter by type (skill, mcp_server, plugin)")
	cmd.Flags().IntVarP(&limit, "limit", "l", 20, "Limit results")

	return cmd
}
