package models

import "time"

type Skill struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Slug          string    `json:"slug"`
	Category      string    `json:"category"`
	Description   *string   `json:"description,omitempty"`
	DefaultWeight float64   `json:"default_weight"`
	CreatedAt     time.Time `json:"created_at"`
}

type RoleSkill struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Category    string  `json:"category"`
	Description *string `json:"description,omitempty"`
	Weight      float64 `json:"weight"`
}
