package moduleport

import (
	"time"
)

type ModuleResponse struct {
	ID        string    `json:"id"`
	CourseID  string    `json:"course_id"`
	Position  int       `json:"position,omitempty"`
	Slug      string    `json:"slug"`
	Summary   string    `json:"summary,omitempty"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
