package questionport

import (
	"time"
)

type QuestionResponse struct {
	ID          string    `json:"id"`
	Answer      int       `json:"answer,omitempty"`
	Explanation string    `json:"explanation,omitempty"`
	LessonID    string    `json:"lesson_id"`
	Options     []string  `json:"options"`
	Position    int       `json:"position,omitempty"`
	Prompt      string    `json:"prompt"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
