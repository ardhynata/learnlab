package lessontextport

import (
	"time"
)

type LessonTextResponse struct {
	ID        string    `json:"id"`
	Body      string    `json:"body,omitempty"`
	LessonID  string    `json:"lesson_id"`
	Locale    string    `json:"locale"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
