package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"devsalary-backend/internal/config"
	"devsalary-backend/internal/database"
	"github.com/jackc/pgx/v5"
)

type JSONSalary struct {
	Country   string  `json:"country"`
	Role      string  `json:"role"`
	Level     string  `json:"level"`
	AnnualUSD float64 `json:"annual_usd"`
}

func main() {
	filePath := flag.String("file", "../devsalary-data.json", "path to salary JSON file")
	reset := flag.Bool("reset", true, "truncate salary_records before importing")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	file, err := os.Open(*filePath)
	if err != nil {
		log.Fatalf("open JSON file: %v", err)
	}
	defer file.Close()
	var records []JSONSalary
	if err := json.NewDecoder(file).Decode(&records); err != nil {
		log.Fatalf("decode JSON: %v", err)
	}

	ctx := context.Background()
	db, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	tx, err := db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		log.Fatalf("begin transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	if *reset {
		if _, err := tx.Exec(ctx, "TRUNCATE TABLE salary_records RESTART IDENTITY"); err != nil {
			log.Fatalf("truncate salary_records: %v", err)
		}
	}

	for i, record := range records {
		_, err := tx.Exec(ctx, `INSERT INTO salary_records (country,role,level,annual_usd,currency) VALUES ($1,$2,$3,$4,$5)`, record.Country, record.Role, record.Level, record.AnnualUSD, "USD")
		if err != nil {
			log.Fatalf("insert record %d: %v", i+1, err)
		}
		if (i+1)%250 == 0 {
			fmt.Printf("Imported %d/%d records\n", i+1, len(records))
		}
	}
	if err := tx.Commit(ctx); err != nil {
		log.Fatalf("commit import: %v", err)
	}
	fmt.Printf("Successfully imported %d salary records at %s\n", len(records), time.Now().Format(time.RFC3339))
}
