package handlers

import (
	"net/http"

	"devsalary-backend/internal/repository"
)

type SkillHandler struct {
	repo *repository.SkillRepository
}

func NewSkillHandler(
	repo *repository.SkillRepository,
) *SkillHandler {
	return &SkillHandler{repo: repo}
}

func (h *SkillHandler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	role := r.URL.Query().Get("role")

	if role == "" {
		skills, err :=
			h.repo.ListAll(r.Context())

		if err != nil {
			writeError(
				w,
				http.StatusInternalServerError,
				err.Error(),
			)
			return
		}

		writeJSON(
			w,
			http.StatusOK,
			map[string]any{
				"data": skills,
			},
		)
		return
	}

	skills, err :=
		h.repo.ListForRole(
			r.Context(),
			role,
		)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"role": role,
			"data": skills,
		},
	)
}
