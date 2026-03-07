package cmd

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
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

			if err := extractArchiveToDir(archiveData, installDir); err != nil {
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

// extractArchiveToDir detects the archive format (ZIP or tar.gz) and extracts it.
func extractArchiveToDir(data []byte, destDir string) error {
	// ZIP magic bytes: PK\x03\x04
	if len(data) >= 4 && data[0] == 0x50 && data[1] == 0x4b && data[2] == 0x03 && data[3] == 0x04 {
		return extractZipToDir(data, destDir)
	}
	return extractTarGzToDir(data, destDir)
}

func extractZipToDir(data []byte, destDir string) error {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}

	// Find common root directory to strip
	rootDir := ""
	for _, f := range r.File {
		name := filepath.ToSlash(f.Name)
		if idx := strings.IndexByte(name, '/'); idx > 0 {
			candidate := name[:idx]
			if rootDir == "" {
				rootDir = candidate
			}
			if candidate != rootDir {
				rootDir = ""
				break
			}
		}
	}

	for _, f := range r.File {
		name := filepath.ToSlash(f.Name)
		// Strip root directory if all files share one
		if rootDir != "" {
			name = strings.TrimPrefix(name, rootDir+"/")
		}
		if name == "" || name == "." {
			continue
		}

		target := filepath.Join(destDir, name)

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		out, err := os.Create(target)
		if err != nil {
			rc.Close()
			return err
		}

		if _, err := io.Copy(out, rc); err != nil {
			out.Close()
			rc.Close()
			return err
		}
		out.Close()
		rc.Close()

		if err := os.Chmod(target, f.Mode()); err != nil {
			return err
		}
	}
	return nil
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
