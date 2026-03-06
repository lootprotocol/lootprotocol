package packaging

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// PackageDirectory creates a tar.gz archive from a directory.
func PackageDirectory(dirPath string) ([]byte, error) {
	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)

	baseName := filepath.Base(dirPath)
	parentDir := filepath.Dir(dirPath)

	err := filepath.Walk(dirPath, func(file string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden directories (except .claude-plugin)
		if fi.IsDir() && strings.HasPrefix(fi.Name(), ".") && fi.Name() != ".claude-plugin" {
			if file != dirPath {
				return filepath.SkipDir
			}
		}
		// Skip node_modules, __pycache__
		if fi.IsDir() && (fi.Name() == "node_modules" || fi.Name() == "__pycache__") {
			return filepath.SkipDir
		}

		relPath, err := filepath.Rel(parentDir, file)
		if err != nil {
			return err
		}

		header, err := tar.FileInfoHeader(fi, "")
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relPath)

		if fi.IsDir() {
			header.Name += "/"
		}

		// Ensure we include baseName as root directory
		if !strings.HasPrefix(header.Name, baseName) {
			return nil
		}

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if !fi.IsDir() {
			f, err := os.Open(file)
			if err != nil {
				return err
			}
			defer f.Close()
			if _, err := io.Copy(tw, f); err != nil {
				return fmt.Errorf("failed to write %s: %w", relPath, err)
			}
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to package directory: %w", err)
	}

	if err := tw.Close(); err != nil {
		return nil, err
	}
	if err := gw.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
