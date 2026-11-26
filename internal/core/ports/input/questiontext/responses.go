package questiontextport

import (
	"time"
)

type QuestionTextResponse struct {
	ID          string    `json:"id"`
	Explanation string    `json:"explanation,omitempty"`
	LessonID    string    `json:"lesson_id"`
	Locale      string    `json:"locale"`
	Options     []string  `json:"options"`
	Position    int       `json:"position,omitempty"`
	Prompt      string    `json:"prompt"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
