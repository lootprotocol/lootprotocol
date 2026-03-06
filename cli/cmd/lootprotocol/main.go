package main

import (
	"os"

	"github.com/lootprotocol/lootprotocol/internal/cmd"
	"github.com/lootprotocol/lootprotocol/internal/output"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	if err := cmd.Execute(version); err != nil {
		output.PrintError(err.Error())
		os.Exit(1)
	}
}
