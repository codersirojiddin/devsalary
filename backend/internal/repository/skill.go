package repository

import (
	"context"
	"fmt"

	"devsalary-backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SkillRepository struct {
	db *pgxpool.Pool
}

func NewSkillRepository(db *pgxpool.Pool) *SkillRepository {
	return &SkillRepository{db: db}
}

func (r *SkillRepository) ListForRole(
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
		return nil, fmt.Errorf("query role skills: %w", err)
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
			return nil, fmt.Errorf("scan role skill: %w", err)
		}

		result = append(result, item)
	}

	return result, rows.Err()
}

func (r *SkillRepository) ListAll(
	ctx context.Context,
) ([]models.Skill, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			name,
			slug,
			category,
			description,
			default_weight,
			created_at
		FROM skills
		ORDER BY category ASC, name ASC
	`)

	if err != nil {
		return nil, fmt.Errorf("query skills: %w", err)
	}

	defer rows.Close()

	result := make([]models.Skill, 0)

	for rows.Next() {
		var item models.Skill

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Slug,
			&item.Category,
			&item.Description,
			&item.DefaultWeight,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan skill: %w", err)
		}

		result = append(result, item)
	}

	return result, rows.Err()
}
