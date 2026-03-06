package output

import (
	"fmt"

	"github.com/fatih/color"

	"github.com/lootprotocol/lootprotocol/internal/validation"
)

// PrintValidationResult prints a validation result with colors.
func PrintValidationResult(result *validation.ValidationResult) {
	if result.Valid {
		color.New(color.FgGreen, color.Bold).Println("Validation passed!")
		if result.Metadata != nil {
			fmt.Printf("  Name: %s\n", result.Metadata.Name)
			fmt.Printf("  Description: %s\n", result.Metadata.Description)
			if result.Metadata.Version != "" {
				fmt.Printf("  Version: %s\n", result.Metadata.Version)
			}
		}
	} else {
		color.New(color.FgRed, color.Bold).Println("Validation failed!")
	}

	if len(result.Errors) > 0 {
		fmt.Println()
		color.Red("%d error(s):", len(result.Errors))
		for _, e := range result.Errors {
			pathStr := ""
			if e.Path != "" {
				pathStr = Gray(fmt.Sprintf(" (%s)", e.Path))
			}
			fmt.Printf("  %s [%s] %s%s\n", color.RedString("x"), e.Code, e.Message, pathStr)
		}
	}

	if len(result.Warnings) > 0 {
		fmt.Println()
		color.Yellow("%d warning(s):", len(result.Warnings))
		for _, w := range result.Warnings {
			pathStr := ""
			if w.Path != "" {
				pathStr = Gray(fmt.Sprintf(" (%s)", w.Path))
			}
			fmt.Printf("  %s [%s] %s%s\n", color.YellowString("!"), w.Code, w.Message, pathStr)
		}
	}
}
