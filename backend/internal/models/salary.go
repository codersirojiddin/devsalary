package models

import "time"

type SalaryRecord struct {
	ID         int64      `json:"id"`
	Country    string     `json:"country"`
	Role       string     `json:"role"`
	Level      string     `json:"level"`
	WorkType   *string    `json:"work_type,omitempty"`
	AnnualUSD  float64    `json:"annual_usd"`
	Currency   string     `json:"currency"`
	SalaryMin  *float64   `json:"salary_min,omitempty"`
	SalaryMax  *float64   `json:"salary_max,omitempty"`
	Source     *string    `json:"source,omitempty"`
	SourceURL  *string    `json:"source_url,omitempty"`
	SourceDate *time.Time `json:"source_date,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

type SalaryStats struct {
	Count   int64   `json:"count"`
	Average float64 `json:"average"`
	Median  float64 `json:"median"`
	Min     float64 `json:"min"`
	Max     float64 `json:"max"`
}
