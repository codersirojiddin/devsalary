package repository

import (
	"context"
	"fmt"
	"strings"

	"devsalary-backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SalaryRepository struct{ db *pgxpool.Pool }

func NewSalaryRepository(db *pgxpool.Pool) *SalaryRepository { return &SalaryRepository{db: db} }

type SalaryFilter struct {
	Country, Role, Level, WorkType string
	Limit, Offset                  int
}

func buildWhere(filter SalaryFilter) (string, []any) {
	where := make([]string, 0, 4)
	args := make([]any, 0, 4)
	idx := 1
	add := func(column, value string) {
		if value != "" {
			where = append(where, fmt.Sprintf("%s = $%d", column, idx))
			args = append(args, value)
			idx++
		}
	}
	add("country", filter.Country)
	add("role", filter.Role)
	add("level", filter.Level)
	add("work_type", filter.WorkType)
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}

func (r *SalaryRepository) List(ctx context.Context, filter SalaryFilter) ([]models.SalaryRecord, error) {
	where, args := buildWhere(filter)
	limitIdx := len(args) + 1
	offsetIdx := len(args) + 2
	query := fmt.Sprintf(`SELECT id,country,role,level,work_type,annual_usd,currency,salary_min,salary_max,source,source_url,source_date,created_at FROM salary_records%s ORDER BY annual_usd DESC LIMIT $%d OFFSET $%d`, where, limitIdx, offsetIdx)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query salaries: %w", err)
	}
	defer rows.Close()

	results := make([]models.SalaryRecord, 0)
	for rows.Next() {
		var item models.SalaryRecord
		if err := rows.Scan(&item.ID, &item.Country, &item.Role, &item.Level, &item.WorkType, &item.AnnualUSD, &item.Currency, &item.SalaryMin, &item.SalaryMax, &item.Source, &item.SourceURL, &item.SourceDate, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan salary: %w", err)
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate salaries: %w", err)
	}
	return results, nil
}

func (r *SalaryRepository) Stats(ctx context.Context, filter SalaryFilter) (models.SalaryStats, error) {
	where, args := buildWhere(filter)
	query := `SELECT COUNT(*),COALESCE(AVG(annual_usd),0),COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY annual_usd),0),COALESCE(MIN(annual_usd),0),COALESCE(MAX(annual_usd),0) FROM salary_records` + where
	var stats models.SalaryStats
	if err := r.db.QueryRow(ctx, query, args...).Scan(&stats.Count, &stats.Average, &stats.Median, &stats.Min, &stats.Max); err != nil {
		return models.SalaryStats{}, fmt.Errorf("query salary stats: %w", err)
	}
	return stats, nil
}
