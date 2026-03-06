package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateSkill_Valid(t *testing.T) {
	data := createZip(t, map[string]string{
		"SKILL.md": "---\ndescription: A test skill\nname: test-skill\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "test-skill", result.Metadata.Name)
	assert.Equal(t, "A test skill", result.Metadata.Description)
}

func TestValidateSkill_ValidTarGz(t *testing.T) {
	data := createTarGz(t, map[string]string{
		"myskill/SKILL.md": "---\ndescription: A test skill\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.tar.gz")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "myskill", result.Metadata.Name)
}

func TestValidateSkill_MissingSkillMd(t *testing.T) {
	data := createZip(t, map[string]string{
		"README.md": "hello",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Len(t, result.Errors, 1)
	assert.Equal(t, "MISSING_FILE", result.Errors[0].Code)
}

func TestValidateSkill_MissingDescription(t *testing.T) {
	data := createZip(t, map[string]string{
		"SKILL.md": "---\nname: test-skill\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	hasDescErr := false
	for _, e := range result.Errors {
		if e.Code == "INVALID_FRONTMATTER" && e.Message == "Frontmatter: description: description must be non-empty" {
			hasDescErr = true
		}
	}
	assert.True(t, hasDescErr, "expected description error")
}

func TestValidateSkill_InvalidName(t *testing.T) {
	data := createZip(t, map[string]string{
		"SKILL.md": "---\ndescription: test\nname: InvalidName\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	hasNameErr := false
	for _, e := range result.Errors {
		if e.Code == "INVALID_FRONTMATTER" && e.Path == "SKILL.md" {
			hasNameErr = true
		}
	}
	assert.True(t, hasNameErr, "expected name error")
}

func TestValidateSkill_ShortBody(t *testing.T) {
	data := createZip(t, map[string]string{
		"SKILL.md": "---\ndescription: test\n---\nShort",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	hasBodyErr := false
	for _, e := range result.Errors {
		if e.Code == "EMPTY_BODY" {
			hasBodyErr = true
		}
	}
	assert.True(t, hasBodyErr, "expected body error")
}

func TestValidateSkill_NameTooLong(t *testing.T) {
	longName := ""
	for i := 0; i < 65; i++ {
		longName += "a"
	}
	data := createZip(t, map[string]string{
		"SKILL.md": "---\ndescription: test\nname: " + longName + "\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
}

func TestValidateSkill_InvalidFormat(t *testing.T) {
	result := ValidateExtension(TypeSkill, []byte("data"), "test.rar")
	assert.False(t, result.Valid)
	assert.Equal(t, "INVALID_FORMAT", result.Errors[0].Code)
}

func TestValidateSkill_SizeExceeded(t *testing.T) {
	data := make([]byte, 6*1024*1024)
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.False(t, result.Valid)
	assert.Equal(t, "SIZE_EXCEEDED", result.Errors[0].Code)
}

func TestValidateSkill_WithRootDir(t *testing.T) {
	data := createZip(t, map[string]string{
		"my-skill/SKILL.md": "---\ndescription: A test skill\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "my-skill", result.Metadata.Name)
}

func TestValidateSkill_DefaultVersion(t *testing.T) {
	data := createZip(t, map[string]string{
		"SKILL.md": "---\ndescription: test\n---\nThis is the skill body with enough content.",
	})
	result := ValidateExtension(TypeSkill, data, "test.zip")
	assert.True(t, result.Valid)
	require.NotNil(t, result.Metadata)
	assert.Equal(t, "1.0.0", result.Metadata.Version)
}
