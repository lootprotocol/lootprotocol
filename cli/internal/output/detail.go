package output

import (
	"fmt"

	"github.com/lootprotocol/lootprotocol/internal/types"
)

// PrintExtensionDetail prints detailed information about a single extension.
func PrintExtensionDetail(ext *types.Extension) {
	fmt.Println()
	fmt.Println(Bold(ext.GetDisplayName()))

	publisher := "unknown"
	if ext.Publisher != nil {
		publisher = ext.Publisher.Username
	}
	fmt.Println(Gray(fmt.Sprintf("@%s/%s", publisher, ext.Slug)))

	fmt.Println()
	fmt.Println(ext.Description)
	fmt.Println()

	fmt.Printf("  %s       %s\n", Cyan("Type:"), string(ext.ExtensionType))
	fmt.Printf("  %s    %s\n", Cyan("Version:"), ext.LatestVersion)
	fmt.Printf("  %s   %s\n", Cyan("Category:"), ext.Category)
	fmt.Printf("  %s  %d\n", Cyan("Downloads:"), ext.DownloadCount)

	if len(ext.Tags) > 0 {
		tags := ""
		for i, tag := range ext.Tags {
			if i > 0 {
				tags += ", "
			}
			tags += tag
		}
		fmt.Printf("  %s       %s\n", Cyan("Tags:"), tags)
	}

	fmt.Println()
	fmt.Printf("  %s    lootprotocol install %s\n", Cyan("Install:"), ext.Slug)
	fmt.Println()
}
