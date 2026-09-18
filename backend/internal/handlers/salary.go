package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"devsalary-backend/internal/repository"
)

type SalaryHandler struct{ repo *repository.SalaryRepository }

func NewSalaryHandler(repo *repository.SalaryRepository) *SalaryHandler {
	return &SalaryHandler{repo: repo}
}

func (h *SalaryHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	filter := parseFilter(r)
	records, err := h.repo.List(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": records, "pagination": map[string]any{"limit": filter.Limit, "offset": filter.Offset, "count": len(records)}})
}

func (h *SalaryHandler) Stats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	filter := parseFilter(r)
	stats, err := h.repo.Stats(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func parseFilter(r *http.Request) repository.SalaryFilter {
	q := r.URL.Query()
	limit, offset := 50, 0
	if v, err := strconv.Atoi(q.Get("limit")); err == nil && q.Get("limit") != "" {
		limit = v
	}
	if v, err := strconv.Atoi(q.Get("offset")); err == nil && q.Get("offset") != "" {
		offset = v
	}
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	return repository.SalaryFilter{Country: q.Get("country"), Role: q.Get("role"), Level: q.Get("level"), WorkType: q.Get("work_type"), Limit: limit, Offset: offset}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
