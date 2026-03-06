package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/output"
	"github.com/lootprotocol/lootprotocol/internal/packaging"
	"github.com/lootprotocol/lootprotocol/internal/validation"
)

func newValidateCmd() *cobra.Command {
	var extType string

	cmd := &cobra.Command{
		Use:   "validate [path]",
		Short: "Validate an extension package",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
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

			// Auto-detect type if not specified
			t := extType
			if t == "" {
				t = detectType(targetPath)
			}
			if t == "" {
				return fmt.Errorf("could not auto-detect extension type. Use --type <skill|mcp_server|plugin>")
			}

			var archiveData []byte
			var filename string

			if info.IsDir() {
				archiveData, err = packaging.PackageDirectory(targetPath)
				if err != nil {
					return fmt.Errorf("failed to package directory: %w", err)
				}
				filename = "extension.tar.gz"
			} else {
				archiveData, err = os.ReadFile(targetPath)
				if err != nil {
					return err
				}
				filename = filepath.Base(targetPath)
			}

			result := validation.ValidateExtension(validation.ExtensionType(t), archiveData, filename)
			output.PrintValidationResult(result)

			if !result.Valid {
				os.Exit(1)
			}
			return nil
		},
	}

	cmd.Flags().StringVarP(&extType, "type", "t", "", "Extension type (skill, mcp_server, plugin)")

	return cmd
}

func detectType(dirPath string) string {
	info, err := os.Stat(dirPath)
	if err != nil || !info.IsDir() {
		return ""
	}

	if _, err := os.Stat(filepath.Join(dirPath, "SKILL.md")); err == nil {
		return "skill"
	}
	if _, err := os.Stat(filepath.Join(dirPath, "mcp.json")); err == nil {
		return "mcp_server"
	}
	if _, err := os.Stat(filepath.Join(dirPath, ".claude-plugin", "plugin.json")); err == nil {
		return "plugin"
	}
	return ""
}
