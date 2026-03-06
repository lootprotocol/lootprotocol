package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/AlecAivazis/survey/v2"
	"github.com/briandowns/spinner"
	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/api"
	"github.com/lootprotocol/lootprotocol/internal/config"
	"github.com/lootprotocol/lootprotocol/internal/output"
	"github.com/lootprotocol/lootprotocol/internal/packaging"
	"github.com/lootprotocol/lootprotocol/internal/validation"
)

var categories = []string{
	"development-tools",
	"testing-qa",
	"documentation",
	"devops-infrastructure",
	"data-analysis",
	"ai-ml",
	"productivity",
	"communication",
	"security",
	"other",
}

func newPublishCmd() *cobra.Command {
	var extType string
	var nonInteractive bool

	cmd := &cobra.Command{
		Use:   "publish [path]",
		Short: "Publish an extension to Loot Protocol",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.ReadConfig()
			if err != nil {
				return err
			}
			if !config.IsLoggedIn(cfg) {
				return fmt.Errorf("you must be logged in. Run: lootprotocol login")
			}

			inputPath := "."
			if len(args) > 0 {
				inputPath = args[0]
			}
			targetPath, err := filepath.Abs(inputPath)
			if err != nil {
				return err
			}

			info, err := os.Stat(targetPath)
			if err != nil {
				return fmt.Errorf("path does not exist: %s", targetPath)
			}

			// Auto-detect type
			t := extType
			if t == "" {
				t = detectType(targetPath)
			}
			if t == "" {
				return fmt.Errorf("could not auto-detect extension type. Use --type <skill|mcp_server|plugin>")
			}

			// Package directory
			var archiveData []byte
			var filename string

			if info.IsDir() {
				s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
				s.Suffix = " Packaging..."
				s.Start()
				archiveData, err = packaging.PackageDirectory(targetPath)
				s.Stop()
				if err != nil {
					return fmt.Errorf("failed to package: %w", err)
				}
				filename = filepath.Base(targetPath) + ".tar.gz"
				output.PrintSuccess("Packaged")
			} else {
				archiveData, err = os.ReadFile(targetPath)
				if err != nil {
					return err
				}
				filename = filepath.Base(targetPath)
			}

			// Local validation first
			fmt.Println("\nRunning local validation...")
			result := validation.ValidateExtension(validation.ExtensionType(t), archiveData, filename)
			output.PrintValidationResult(result)

			if !result.Valid {
				return fmt.Errorf("fix validation errors before publishing")
			}

			// Read lootprotocol.json for metadata defaults
			metadataDir := targetPath
			if !info.IsDir() {
				metadataDir = filepath.Dir(targetPath)
			}
			defaults := readLootprotocolJSON(metadataDir)

			var displayName, category, tagsInput string

			if nonInteractive {
				// In non-interactive mode, use defaults or metadata
				displayName = defaults["displayName"]
				if displayName == "" && result.Metadata != nil {
					displayName = result.Metadata.Name
				}
				category = defaults["category"]
				if category == "" {
					category = "other"
				}
				tagsInput = defaults["tags"]
			} else {
				// Interactive prompts
				if defaults["displayName"] != "" {
					displayName = defaults["displayName"]
				} else {
					defaultName := ""
					if result.Metadata != nil {
						defaultName = result.Metadata.Name
					}
					prompt := &survey.Input{
						Message: "Display name:",
						Default: defaultName,
					}
					if err := survey.AskOne(prompt, &displayName); err != nil {
						return err
					}
				}

				if defaults["category"] != "" {
					category = defaults["category"]
				} else {
					prompt := &survey.Select{
						Message: "Category:",
						Options: categories,
					}
					if err := survey.AskOne(prompt, &category); err != nil {
						return err
					}
				}

				if defaults["tags"] != "" {
					tagsInput = defaults["tags"]
				} else {
					prompt := &survey.Input{
						Message: "Tags (comma-separated):",
					}
					if err := survey.AskOne(prompt, &tagsInput); err != nil {
						return err
					}
				}
			}

			var tags []string
			if tagsInput != "" {
				for _, tag := range strings.Split(tagsInput, ",") {
					tag = strings.TrimSpace(tag)
					if tag != "" {
						tags = append(tags, tag)
					}
				}
			}

			// Upload
			s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
			s.Suffix = " Publishing..."
			s.Start()

			client := api.NewClient(cfg.ApiURL, cfg.AccessToken)
			ext, err := client.PublishExtension(archiveData, filename, t, displayName, category, tags)
			s.Stop()
			if err != nil {
				return err
			}

			output.PrintSuccess("Published!")
			fmt.Println()
			output.PrintSuccess(fmt.Sprintf("%s v%s", ext.GetDisplayName(), ext.LatestVersion))
			fmt.Printf("  URL: https://lootprotocol.com/extensions/%s\n", ext.Slug)
			fmt.Printf("  Install: lootprotocol install %s\n", ext.Slug)
			fmt.Println()
			return nil
		},
	}

	cmd.Flags().StringVarP(&extType, "type", "t", "", "Extension type (skill, mcp_server, plugin)")
	cmd.Flags().BoolVar(&nonInteractive, "non-interactive", false, "Non-interactive mode (for CI)")

	return cmd
}

func readLootprotocolJSON(dir string) map[string]string {
	data, err := os.ReadFile(filepath.Join(dir, "lootprotocol.json"))
	if err != nil {
		return map[string]string{}
	}
	var result map[string]string
	if json.Unmarshal(data, &result) != nil {
		return map[string]string{}
	}
	return result
}
