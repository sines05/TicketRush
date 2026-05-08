package main

import (
	"fmt"
	"ticketrush/internal/config"
	"ticketrush/internal/repository"
)

func main() {
	cfg := config.LoadConfig()
	cfg.DBHost = "localhost"
	cfg.DBPort = "5433"
	cfg.DBUser = "user"
	cfg.DBPassword = "password"
	cfg.DBName = "ticketrush"

	fmt.Println("Running migrations...")
	repository.RunMigrations(cfg)
	fmt.Println("Migrations finished.")
}
