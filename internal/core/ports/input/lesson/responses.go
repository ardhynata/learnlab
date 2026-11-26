package lessonport

import (
	"time"
)

type LessonResponse struct {
	ID        string    `json:"id"`
	Body      string    `json:"body,omitempty"`
	CourseID  string    `json:"course_id"`
	Kind      string    `json:"kind"`
	Minutes   int       `json:"minutes,omitempty"`
	ModuleID  string    `json:"module_id,omitempty"`
	Position  int       `json:"position,omitempty"`
	Simulator string    `json:"simulator,omitempty"`
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
