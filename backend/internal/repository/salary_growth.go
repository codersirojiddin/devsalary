package repository

import (
	"context"
	"fmt"
	"strings"

	"devsalary-backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SalaryGrowthRepository struct {
	db *pgxpool.Pool
}

func NewSalaryGrowthRepository(
	db *pgxpool.Pool,
) *SalaryGrowthRepository {
	return &SalaryGrowthRepository{db: db}
}

func (r *SalaryGrowthRepository) MarketMedian(
	ctx context.Context,
	country string,
	role string,
	level string,
) (float64, int64, error) {

	var median float64
	var count int64

	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(
				PERCENTILE_CONT(0.5)
				WITHIN GROUP (ORDER BY annual_usd),
				0
			)
		FROM salary_records
		WHERE country = $1
		  AND role = $2
		  AND level = $3
	`, country, role, level).Scan(
		&count,
		&median,
	)

	if err != nil {
		return 0, 0, fmt.Errorf(
			"query market median: %w",
			err,
		)
	}

	return median, count, nil
}

func (r *SalaryGrowthRepository) RoleSkills(
	ctx context.Context,
	role string,
) ([]models.RoleSkill, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			rs.id,
			s.name,
			s.slug,
			s.category,
			s.description,
			rs.weight
		FROM role_skill_weights rs
		JOIN skills s
			ON s.id = rs.skill_id
		WHERE rs.role = $1
		ORDER BY rs.weight DESC, s.name ASC
	`, role)

	if err != nil {
		return nil, fmt.Errorf(
			"query growth skills: %w",
			err,
		)
	}

	defer rows.Close()

	result := make([]models.RoleSkill, 0)

	for rows.Next() {
		var item models.RoleSkill

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Slug,
			&item.Category,
			&item.Description,
			&item.Weight,
		); err != nil {
			return nil, fmt.Errorf(
				"scan growth skill: %w",
				err,
			)
		}

		result = append(result, item)
	}

	return result, rows.Err()
}

func SelectedSkillSet(
	values []string,
) map[string]struct{} {

	seen := make(map[string]struct{})

	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))

		if value == "" {
			continue
		}

		seen[value] = struct{}{}
	}

	return seen
}
