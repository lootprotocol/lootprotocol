package output

import (
	"fmt"

	"github.com/fatih/color"
)

// PrintSuccess prints a success message in green.
func PrintSuccess(msg string) {
	color.Green("%s", msg)
}

// PrintError prints an error message in red with "Error: " prefix.
func PrintError(msg string) {
	color.Red("Error: %s", msg)
}

// PrintWarning prints a warning message in yellow.
func PrintWarning(msg string) {
	color.Yellow("Warning: %s", msg)
}

// Truncate truncates a string to maxLen, adding "..." if needed.
func Truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// Cyan returns a cyan-colored string.
func Cyan(s string) string {
	return color.CyanString("%s", s)
}

// Bold returns a bold string.
func Bold(s string) string {
	return color.New(color.Bold).Sprint(s)
}

// Gray returns a gray (dark) string.
func Gray(s string) string {
	return color.New(color.FgHiBlack).Sprint(s)
}

// Println prints a line to stdout.
func Println(a ...interface{}) {
	fmt.Println(a...)
}

// Printf prints formatted output to stdout.
func Printf(format string, a ...interface{}) {
	fmt.Printf(format, a...)
}
