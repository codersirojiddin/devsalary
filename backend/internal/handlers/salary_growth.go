package handlers

import (
	"encoding/json"
	"net/http"

	"devsalary-backend/internal/models"
	"devsalary-backend/internal/services"
)

type SalaryGrowthHandler struct {
	service *services.SalaryGrowthService
}

func NewSalaryGrowthHandler(
	service *services.SalaryGrowthService,
) *SalaryGrowthHandler {
	return &SalaryGrowthHandler{service: service}
}

func (h *SalaryGrowthHandler) Calculate(
	w http.ResponseWriter,
	r *http.Request,
) {

	if r.Method != http.MethodPost {
		writeError(
			w,
			http.StatusMethodNotAllowed,
			"method not allowed",
		)
		return
	}

	var req models.SalaryGrowthRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid JSON request: "+err.Error(),
		)
		return
	}

	result, err :=
		h.service.Calculate(
			r.Context(),
			req,
		)

	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			err.Error(),
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		result,
	)
}
