package cmd

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/briandowns/spinner"
	"github.com/spf13/cobra"

	"github.com/lootprotocol/lootprotocol/internal/api"
	"github.com/lootprotocol/lootprotocol/internal/config"
	"github.com/lootprotocol/lootprotocol/internal/output"
	"github.com/lootprotocol/lootprotocol/internal/types"
)

func newInstallCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "install <slug>",
		Short: "Install an extension from Loot Protocol",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			slug := args[0]

			cfg, err := config.ReadConfig()
			if err != nil {
				return err
			}
			if !config.IsLoggedIn(cfg) {
				return fmt.Errorf("you must be logged in. Run: lootprotocol login")
			}

			client := api.NewClient(cfg.ApiURL, cfg.AccessToken)

			s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
			s.Suffix = " Fetching extension info..."
			s.Start()

			ext, err := client.GetExtension(slug)
			if err != nil {
				s.Stop()
				return err
			}

			s.Suffix = " Downloading..."
			archiveData, err := client.DownloadExtension(slug)
			if err != nil {
				s.Stop()
				return err
			}

			typeDir := types.TypeDirs[ext.ExtensionType]
			if typeDir == "" {
				typeDir = "extensions"
			}

			home, _ := os.UserHomeDir()
			installDir := filepath.Join(home, ".claude", typeDir, slug)

			s.Suffix = " Installing..."
			if err := os.MkdirAll(installDir, 0o755); err != nil {
				s.Stop()
				return err
			}

			if err := extractTarGzToDir(archiveData, installDir); err != nil {
				s.Stop()
				return fmt.Errorf("failed to extract archive: %w", err)
			}

			s.Stop()
			output.PrintSuccess(fmt.Sprintf("Installed %s to %s", ext.GetDisplayName(), installDir))
			fmt.Println()
			output.PrintSuccess(fmt.Sprintf("Extension type: %s", ext.ExtensionType))
			fmt.Printf("  Location: %s\n", installDir)
			fmt.Println()
			fmt.Println("  Restart your Claude Code session to pick up the new extension.")
			fmt.Println()
			return nil
		},
	}
}

func extractTarGzToDir(data []byte, destDir string) error {
	gr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return err
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		// Strip first path component (root dir)
		name := header.Name
		parts := filepath.SplitList(name)
		if len(parts) == 0 {
			continue
		}
		// Use filepath.ToSlash for consistent handling
		slashed := filepath.ToSlash(name)
		idx := 0
		for i, c := range slashed {
			if c == '/' {
				idx = i + 1
				break
			}
		}
		stripped := slashed[idx:]
		if stripped == "" {
			continue
		}

		target := filepath.Join(destDir, stripped)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			f, err := os.Create(target)
			if err != nil {
				return err
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return err
			}
			f.Close()
			if err := os.Chmod(target, os.FileMode(header.Mode)); err != nil {
				return err
			}
		}
	}
	return nil
}
