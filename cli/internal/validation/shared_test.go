package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCheckArchiveSize_WithinLimit(t *testing.T) {
	data := make([]byte, 100)
	result := CheckArchiveSize(data, 200)
	assert.Nil(t, result)
}

func TestCheckArchiveSize_ExceedsLimit(t *testing.T) {
	data := make([]byte, 300)
	result := CheckArchiveSize(data, 200)
	assert.NotNil(t, result)
	assert.Equal(t, "SIZE_EXCEEDED", result.Code)
}

func TestCheckPathTraversal_Safe(t *testing.T) {
	files := map[string][]byte{
		"dir/file.txt":    []byte("ok"),
		"another/path.md": []byte("ok"),
	}
	result := CheckPathTraversal(files)
	assert.Nil(t, result)
}

func TestCheckPathTraversal_DotDot(t *testing.T) {
	files := map[string][]byte{
		"../etc/passwd": []byte("bad"),
	}
	result := CheckPathTraversal(files)
	assert.NotNil(t, result)
	assert.Equal(t, "PATH_TRAVERSAL", result.Code)
}

func TestCheckPathTraversal_Absolute(t *testing.T) {
	files := map[string][]byte{
		"/etc/passwd": []byte("bad"),
	}
	result := CheckPathTraversal(files)
	assert.NotNil(t, result)
	assert.Equal(t, "PATH_TRAVERSAL", result.Code)
}

func TestReadFileFromArchive_Direct(t *testing.T) {
	contents := &ArchiveContents{
		Files:   map[string][]byte{"README.md": []byte("hello")},
		RootDir: "",
	}
	assert.Equal(t, "hello", ReadFileFromArchive(contents, "README.md"))
}

func TestReadFileFromArchive_UnderRootDir(t *testing.T) {
	contents := &ArchiveContents{
		Files:   map[string][]byte{"myext/README.md": []byte("hello")},
		RootDir: "myext",
	}
	assert.Equal(t, "hello", ReadFileFromArchive(contents, "README.md"))
}

func TestReadFileFromArchive_NotFound(t *testing.T) {
	contents := &ArchiveContents{
		Files:   map[string][]byte{"other.txt": []byte("hello")},
		RootDir: "",
	}
	assert.Equal(t, "", ReadFileFromArchive(contents, "README.md"))
}

func TestFileExistsInArchive(t *testing.T) {
	contents := &ArchiveContents{
		Files:   map[string][]byte{"myext/file.txt": []byte("data")},
		RootDir: "myext",
	}
	assert.True(t, FileExistsInArchive(contents, "file.txt"))
	assert.False(t, FileExistsInArchive(contents, "missing.txt"))
}

func TestDirExistsInArchive(t *testing.T) {
	contents := &ArchiveContents{
		Files:   map[string][]byte{"src/index.ts": []byte("code")},
		RootDir: "",
	}
	assert.True(t, DirExistsInArchive(contents, "src"))
	assert.False(t, DirExistsInArchive(contents, "lib"))
}

func TestDirExistsInArchive_WithRootDir(t *testing.T) {
	contents := &ArchiveContents{
		Files:   map[string][]byte{"myext/src/index.ts": []byte("code")},
		RootDir: "myext",
	}
	assert.True(t, DirExistsInArchive(contents, "src"))
}

func TestGetFilesInDir(t *testing.T) {
	contents := &ArchiveContents{
		Files: map[string][]byte{
			"skills/search/SKILL.md":  []byte("a"),
			"skills/search/extra.md":  []byte("b"),
			"skills/install/SKILL.md": []byte("c"),
			"other/file.txt":          []byte("d"),
		},
		RootDir: "",
	}
	files := GetFilesInDir(contents, "skills")
	assert.Len(t, files, 3)
}

func TestFormatBytes(t *testing.T) {
	assert.Equal(t, "100B", formatBytes(100))
	assert.Equal(t, "1.0KB", formatBytes(1024))
	assert.Equal(t, "1.5KB", formatBytes(1536))
	assert.Equal(t, "1.0MB", formatBytes(1024*1024))
	assert.Equal(t, "5.0MB", formatBytes(5*1024*1024))
}
