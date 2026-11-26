package moduletextport

import (
	"time"
)

type ModuleTextResponse struct {
	ID        string    `json:"id"`
	Locale    string    `json:"locale"`
	ModuleID  string    `json:"module_id"`
	Summary   string    `json:"summary,omitempty"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
