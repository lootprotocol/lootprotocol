package output

import (
	"fmt"
	"os"
	"strconv"

	"github.com/fatih/color"
	"github.com/olekukonko/tablewriter"

	"github.com/lootprotocol/lootprotocol/internal/types"
)

// PrintExtensionTable prints extensions in a formatted table.
func PrintExtensionTable(extensions []types.Extension) {
	if len(extensions) == 0 {
		color.Yellow("No extensions found. Try broadening your search.")
		return
	}

	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Name", "Type", "Downloads", "Description"})
	table.SetColWidth(50)
	table.SetHeaderColor(
		tablewriter.Colors{tablewriter.FgCyanColor},
		tablewriter.Colors{tablewriter.FgCyanColor},
		tablewriter.Colors{tablewriter.FgCyanColor},
		tablewriter.Colors{tablewriter.FgCyanColor},
	)
	table.SetBorder(true)

	for _, ext := range extensions {
		table.Append([]string{
			ext.GetDisplayName(),
			string(ext.ExtensionType),
			strconv.Itoa(ext.DownloadCount),
			Truncate(ext.Description, 47),
		})
	}

	table.Render()
}

// PrintInstalledTable prints installed extensions in a formatted table.
func PrintInstalledTable(entries []InstalledEntry) {
	if len(entries) == 0 {
		fmt.Println("No extensions installed.")
		return
	}

	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Name", "Type", "Location"})
	table.SetHeaderColor(
		tablewriter.Colors{tablewriter.FgCyanColor},
		tablewriter.Colors{tablewriter.FgCyanColor},
		tablewriter.Colors{tablewriter.FgCyanColor},
	)
	table.SetBorder(true)

	for _, e := range entries {
		table.Append([]string{e.Name, e.Type, e.Location})
	}

	table.Render()
}

// InstalledEntry represents an installed extension for display.
type InstalledEntry struct {
	Name     string
	Type     string
	Location string
}
