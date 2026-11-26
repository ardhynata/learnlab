package pathtextport

import (
	"time"
)

type PathTextResponse struct {
	ID        string    `json:"id"`
	Locale    string    `json:"locale"`
	PathID    string    `json:"path_id"`
	Summary   string    `json:"summary,omitempty"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
