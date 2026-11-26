package pathport

import (
	"time"
)

type PathResponse struct {
	ID        string    `json:"id"`
	Level     string    `json:"level"`
	Position  int       `json:"position,omitempty"`
	Requires  []string  `json:"requires,omitempty"`
	Slug      string    `json:"slug"`
	Summary   string    `json:"summary"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
