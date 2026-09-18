package models

type SalaryGrowthRequest struct {
	Country       string   `json:"country"`
	Role          string   `json:"role"`
	Level         string   `json:"level"`
	CurrentSalary float64  `json:"current_salary"`
	SkillSlugs    []string `json:"skill_slugs"`
}

type SalaryGrowthSkill struct {
	Name     string  `json:"name"`
	Slug     string  `json:"slug"`
	Category string  `json:"category"`
	Weight   float64 `json:"weight"`
	Selected bool    `json:"selected"`
}

type SalaryGrowthResult struct {
	MarketMedian               float64             `json:"market_median"`
	CurrentSalary              float64             `json:"current_salary"`
	SkillGrowthPercent         float64             `json:"skill_growth_percent"`
	EstimatedSalaryAfterSkills float64             `json:"estimated_salary_after_skills"`
	EstimatedGrowthAmount      float64             `json:"estimated_growth_amount"`
	GapToMarketMedian          float64             `json:"gap_to_market_median"`
	MarketAlignmentPercent     float64             `json:"market_alignment_percent"`
	SelectedSkills             []SalaryGrowthSkill `json:"selected_skills"`
	RecommendedSkills          []SalaryGrowthSkill `json:"recommended_skills"`
	ModelNote                  string              `json:"model_note"`
}
