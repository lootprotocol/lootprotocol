package packaging

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPackageDirectory(t *testing.T) {
	tmpDir := t.TempDir()
	extDir := filepath.Join(tmpDir, "my-extension")
	require.NoError(t, os.MkdirAll(extDir, 0o755))

	// Create test files
	require.NoError(t, os.WriteFile(filepath.Join(extDir, "SKILL.md"), []byte("# Skill"), 0o644))
	require.NoError(t, os.MkdirAll(filepath.Join(extDir, "src"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(extDir, "src", "main.ts"), []byte("code"), 0o644))

	data, err := PackageDirectory(extDir)
	require.NoError(t, err)
	assert.Greater(t, len(data), 0)

	// Verify contents
	files := extractTarGzFiles(t, data)
	assert.Contains(t, files, "my-extension/SKILL.md")
	assert.Contains(t, files, "my-extension/src/main.ts")
}

func TestPackageDirectory_SkipsNodeModules(t *testing.T) {
	tmpDir := t.TempDir()
	extDir := filepath.Join(tmpDir, "ext")
	require.NoError(t, os.MkdirAll(filepath.Join(extDir, "node_modules", "dep"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(extDir, "node_modules", "dep", "index.js"), []byte("dep"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(extDir, "index.ts"), []byte("code"), 0o644))

	data, err := PackageDirectory(extDir)
	require.NoError(t, err)

	files := extractTarGzFiles(t, data)
	assert.Contains(t, files, "ext/index.ts")
	for f := range files {
		assert.NotContains(t, f, "node_modules")
	}
}

func TestPackageDirectory_IncludesClaudePlugin(t *testing.T) {
	tmpDir := t.TempDir()
	extDir := filepath.Join(tmpDir, "ext")
	require.NoError(t, os.MkdirAll(filepath.Join(extDir, ".claude-plugin"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(extDir, ".claude-plugin", "plugin.json"), []byte(`{}`), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(extDir, "README.md"), []byte("readme"), 0o644))

	data, err := PackageDirectory(extDir)
	require.NoError(t, err)

	files := extractTarGzFiles(t, data)
	assert.Contains(t, files, "ext/.claude-plugin/plugin.json")
}

func extractTarGzFiles(t *testing.T, data []byte) map[string]string {
	t.Helper()
	gr, err := gzip.NewReader(bytes.NewReader(data))
	require.NoError(t, err)
	defer gr.Close()

	tr := tar.NewReader(gr)
	files := make(map[string]string)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
		if hdr.Typeflag == tar.TypeReg {
			content, err := io.ReadAll(tr)
			require.NoError(t, err)
			files[hdr.Name] = string(content)
		}
	}
	return files
}
