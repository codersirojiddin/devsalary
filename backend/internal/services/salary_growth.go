package services

import (
	"context"
	"fmt"
	"math"

	"devsalary-backend/internal/models"
	"devsalary-backend/internal/repository"
)

const maxSkillGrowthPercent = 30.0

type SalaryGrowthService struct {
	repo *repository.SalaryGrowthRepository
}

func NewSalaryGrowthService(
	repo *repository.SalaryGrowthRepository,
) *SalaryGrowthService {
	return &SalaryGrowthService{repo: repo}
}

func (s *SalaryGrowthService) Calculate(
	ctx context.Context,
	req models.SalaryGrowthRequest,
) (models.SalaryGrowthResult, error) {

	if req.Country == "" {
		return models.SalaryGrowthResult{},
			fmt.Errorf("country is required")
	}

	if req.Role == "" {
		return models.SalaryGrowthResult{},
			fmt.Errorf("role is required")
	}

	if req.Level == "" {
		return models.SalaryGrowthResult{},
			fmt.Errorf("level is required")
	}

	if req.CurrentSalary <= 0 {
		return models.SalaryGrowthResult{},
			fmt.Errorf("current_salary must be greater than 0")
	}

	marketMedian, records, err :=
		s.repo.MarketMedian(
			ctx,
			req.Country,
			req.Role,
			req.Level,
		)

	if err != nil {
		return models.SalaryGrowthResult{}, err
	}

	if records == 0 {
		return models.SalaryGrowthResult{},
			fmt.Errorf(
				"no salary records found for %s / %s / %s",
				req.Country,
				req.Role,
				req.Level,
			)
	}

	roleSkills, err :=
		s.repo.RoleSkills(ctx, req.Role)

	if err != nil {
		return models.SalaryGrowthResult{}, err
	}

	selectedSet :=
		repository.SelectedSkillSet(req.SkillSlugs)

	selected := make(
		[]models.SalaryGrowthSkill,
		0,
	)

	recommended := make(
		[]models.SalaryGrowthSkill,
		0,
	)

	growthPercent := 0.0

	for _, skill := range roleSkills {

		_, isSelected :=
			selectedSet[skill.Slug]

		item := models.SalaryGrowthSkill{
			Name:     skill.Name,
			Slug:     skill.Slug,
			Category: skill.Category,
			Weight:   skill.Weight,
			Selected: isSelected,
		}

		if isSelected {
			selected =
				append(selected, item)

			growthPercent += skill.Weight
		} else if len(recommended) < 5 {
			recommended =
				append(recommended, item)
		}
	}

	growthPercent =
		math.Min(
			growthPercent,
			maxSkillGrowthPercent,
		)

	growthPercent = round1(growthPercent)

	estimatedAfterSkills :=
		req.CurrentSalary *
			(1 + growthPercent/100)

	estimatedGrowth :=
		estimatedAfterSkills -
			req.CurrentSalary

	gapToMarket :=
		marketMedian -
			estimatedAfterSkills

	alignment := 0.0

	if marketMedian > 0 {
		alignment =
			estimatedAfterSkills /
				marketMedian *
				100
	}

	alignment =
		math.Min(
			math.Max(alignment, 0),
			200,
		)

	return models.SalaryGrowthResult{
		MarketMedian: round2(marketMedian),

		CurrentSalary: round2(req.CurrentSalary),

		SkillGrowthPercent: growthPercent,

		EstimatedSalaryAfterSkills: round2(estimatedAfterSkills),

		EstimatedGrowthAmount: round2(estimatedGrowth),

		GapToMarketMedian: round2(gapToMarket),

		MarketAlignmentPercent: round1(alignment),

		SelectedSkills: selected,

		RecommendedSkills: recommended,

		ModelNote: "Skill weights are configurable model assumptions for v1.1. They do not represent a causal or guaranteed salary increase. Market median comes directly from the selected DevSalary salary records.",
	}, nil
}

func round1(value float64) float64 {
	return math.Round(value*10) / 10
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
