package validation

import (
	"fmt"
	"path"
	"strings"
)

// CheckArchiveSize validates the archive size against a maximum.
func CheckArchiveSize(data []byte, maxBytes int) *ValidationError {
	if len(data) > maxBytes {
		return &ValidationError{
			Code:    "SIZE_EXCEEDED",
			Message: fmt.Sprintf("Archive size %s exceeds maximum %s", formatBytes(len(data)), formatBytes(maxBytes)),
		}
	}
	return nil
}

// CheckPathTraversal checks for path traversal attacks in archive file paths.
func CheckPathTraversal(files map[string][]byte) *ValidationError {
	for filePath := range files {
		if strings.Contains(filePath, "..") || path.IsAbs(filePath) {
			return &ValidationError{
				Code:    "PATH_TRAVERSAL",
				Message: fmt.Sprintf("Dangerous path detected: %s", filePath),
				Path:    filePath,
			}
		}
	}
	return nil
}

// ReadFileFromArchive reads a file from the archive, checking both direct path and under rootDir.
func ReadFileFromArchive(contents *ArchiveContents, relativePath string) string {
	if data, ok := contents.Files[relativePath]; ok {
		return string(data)
	}
	if contents.RootDir != "" {
		if data, ok := contents.Files[contents.RootDir+"/"+relativePath]; ok {
			return string(data)
		}
	}
	return ""
}

// FileExistsInArchive checks whether a file exists in the archive.
func FileExistsInArchive(contents *ArchiveContents, relativePath string) bool {
	if _, ok := contents.Files[relativePath]; ok {
		return true
	}
	if contents.RootDir != "" {
		if _, ok := contents.Files[contents.RootDir+"/"+relativePath]; ok {
			return true
		}
	}
	return false
}

// DirExistsInArchive checks whether a directory (prefix) exists in the archive.
func DirExistsInArchive(contents *ArchiveContents, dirPath string) bool {
	normalizedDir := dirPath
	if !strings.HasSuffix(normalizedDir, "/") {
		normalizedDir += "/"
	}
	for filePath := range contents.Files {
		if strings.HasPrefix(filePath, normalizedDir) {
			return true
		}
		if contents.RootDir != "" && strings.HasPrefix(filePath, contents.RootDir+"/"+normalizedDir) {
			return true
		}
	}
	return false
}

// GetFilesInDir returns all file paths under a given directory in the archive.
func GetFilesInDir(contents *ArchiveContents, dirPath string) []string {
	normalizedDir := dirPath
	if !strings.HasSuffix(normalizedDir, "/") {
		normalizedDir += "/"
	}
	var result []string
	for filePath := range contents.Files {
		if strings.HasPrefix(filePath, normalizedDir) {
			result = append(result, filePath)
		} else if contents.RootDir != "" && strings.HasPrefix(filePath, contents.RootDir+"/"+normalizedDir) {
			result = append(result, filePath[len(contents.RootDir)+1:])
		}
	}
	return result
}

func formatBytes(bytes int) string {
	if bytes < 1024 {
		return fmt.Sprintf("%dB", bytes)
	}
	if bytes < 1024*1024 {
		return fmt.Sprintf("%.1fKB", float64(bytes)/1024)
	}
	return fmt.Sprintf("%.1fMB", float64(bytes)/(1024*1024))
}
