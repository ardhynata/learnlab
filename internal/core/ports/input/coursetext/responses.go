package coursetextport

import (
	"time"
)

type CourseTextResponse struct {
	ID        string    `json:"id"`
	CourseID  string    `json:"course_id"`
	Locale    string    `json:"locale"`
	Summary   string    `json:"summary,omitempty"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
