package courseport

import (
	"time"
)

type CourseResponse struct {
	ID        string    `json:"id"`
	Level     string    `json:"level"`
	PathID    string    `json:"path_id,omitempty"`
	Position  int       `json:"position,omitempty"`
	Slug      string    `json:"slug"`
	Summary   string    `json:"summary"`
	Title     string    `json:"title"`
	Topic     string    `json:"topic"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
