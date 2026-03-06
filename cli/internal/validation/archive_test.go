package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractZip(t *testing.T) {
	data := createZip(t, map[string]string{
		"myext/SKILL.md": "---\ndescription: test\n---\nHello world body content",
		"myext/extra.txt": "extra content",
	})

	contents, err := ExtractZip(data)
	require.NoError(t, err)
	assert.Equal(t, "myext", contents.RootDir)
	assert.Len(t, contents.Files, 2)
	assert.Contains(t, string(contents.Files["myext/SKILL.md"]), "Hello world")
}

func TestExtractTarGz(t *testing.T) {
	data := createTarGz(t, map[string]string{
		"myext/SKILL.md": "---\ndescription: test\n---\nHello world body content",
		"myext/extra.txt": "extra content",
	})

	contents, err := ExtractTarGz(data)
	require.NoError(t, err)
	assert.Equal(t, "myext", contents.RootDir)
	assert.Len(t, contents.Files, 2)
}

func TestExtractArchive_Zip(t *testing.T) {
	data := createZip(t, map[string]string{"file.txt": "content"})
	contents, err := ExtractArchive(data, "test.zip")
	require.NoError(t, err)
	assert.Len(t, contents.Files, 1)
}

func TestExtractArchive_TarGz(t *testing.T) {
	data := createTarGz(t, map[string]string{"file.txt": "content"})
	contents, err := ExtractArchive(data, "test.tar.gz")
	require.NoError(t, err)
	assert.Len(t, contents.Files, 1)
}

func TestExtractArchive_Tgz(t *testing.T) {
	data := createTarGz(t, map[string]string{"file.txt": "content"})
	contents, err := ExtractArchive(data, "test.tgz")
	require.NoError(t, err)
	assert.Len(t, contents.Files, 1)
}

func TestExtractArchive_UnsupportedFormat(t *testing.T) {
	_, err := ExtractArchive([]byte("data"), "test.rar")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported archive format")
}

func TestDetectRootDir_NoRoot(t *testing.T) {
	files := map[string][]byte{
		"file1.txt": []byte("a"),
		"file2.txt": []byte("b"),
	}
	assert.Equal(t, "", detectRootDir(files))
}

func TestDetectRootDir_WithRoot(t *testing.T) {
	files := map[string][]byte{
		"mydir/file1.txt": []byte("a"),
		"mydir/file2.txt": []byte("b"),
	}
	assert.Equal(t, "mydir", detectRootDir(files))
}

func TestDetectRootDir_MultipleRoots(t *testing.T) {
	files := map[string][]byte{
		"dir1/file1.txt": []byte("a"),
		"dir2/file2.txt": []byte("b"),
	}
	assert.Equal(t, "", detectRootDir(files))
}

func TestDetectRootDir_Empty(t *testing.T) {
	assert.Equal(t, "", detectRootDir(map[string][]byte{}))
}
