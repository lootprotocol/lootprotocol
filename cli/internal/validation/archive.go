package validation

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"path/filepath"
	"strings"
)

// ExtractArchive extracts a zip or tar.gz archive from bytes.
func ExtractArchive(data []byte, filename string) (*ArchiveContents, error) {
	if strings.HasSuffix(filename, ".zip") {
		return ExtractZip(data)
	}
	if strings.HasSuffix(filename, ".tar.gz") || strings.HasSuffix(filename, ".tgz") {
		return ExtractTarGz(data)
	}
	return nil, fmt.Errorf("unsupported archive format: %s", filename)
}

// ExtractZip extracts a zip archive from bytes.
func ExtractZip(data []byte) (*ArchiveContents, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("failed to open zip: %w", err)
	}

	files := make(map[string][]byte)
	for _, f := range reader.File {
		if f.FileInfo().IsDir() {
			continue
		}
		normalized := normalizePath(f.Name)

		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open %s: %w", f.Name, err)
		}
		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %w", f.Name, err)
		}
		files[normalized] = content
	}

	return &ArchiveContents{
		Files:   files,
		RootDir: detectRootDir(files),
	}, nil
}

// ExtractTarGz extracts a tar.gz archive from bytes.
func ExtractTarGz(data []byte) (*ArchiveContents, error) {
	gzReader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to open gzip: %w", err)
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	files := make(map[string][]byte)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read tar: %w", err)
		}

		if header.Typeflag == tar.TypeDir {
			continue
		}
		if header.Typeflag != tar.TypeReg {
			continue
		}

		normalized := normalizePath(header.Name)
		content, err := io.ReadAll(tarReader)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %w", header.Name, err)
		}
		files[normalized] = content
	}

	return &ArchiveContents{
		Files:   files,
		RootDir: detectRootDir(files),
	}, nil
}

func normalizePath(p string) string {
	p = filepath.ToSlash(p)
	p = strings.TrimPrefix(p, "/")
	return p
}

func detectRootDir(files map[string][]byte) string {
	if len(files) == 0 {
		return ""
	}

	firstSegments := make(map[string]bool)
	for p := range files {
		parts := strings.SplitN(p, "/", 2)
		if len(parts) > 1 {
			firstSegments[parts[0]] = true
		}
	}

	if len(firstSegments) == 1 {
		var rootDir string
		for k := range firstSegments {
			rootDir = k
		}
		// Check all files are under this root
		for p := range files {
			if !strings.HasPrefix(p, rootDir+"/") {
				return ""
			}
		}
		return rootDir
	}

	return ""
}
