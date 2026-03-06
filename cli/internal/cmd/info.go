package cmd

import (
	"time"

	"github.com/briandowns/spinner"
	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/api"
	"github.com/lootprotocol/lootprotocol/internal/config"
	"github.com/lootprotocol/lootprotocol/internal/output"
)

func newInfoCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "info <slug>",
		Short: "Show details about an extension",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			slug := args[0]

			cfg, err := config.ReadConfig()
			if err != nil {
				return err
			}

			client := api.NewClient(cfg.ApiURL, cfg.AccessToken)

			s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
			s.Suffix = " Fetching extension info..."
			s.Start()

			ext, err := client.GetExtension(slug)
			s.Stop()
			if err != nil {
				return err
			}

			output.PrintExtensionDetail(ext)
			return nil
		},
	}
}
