package progressport

import (
	"time"
)

type ProgressResponse struct {
	ID string `json:"id"`
	// Bool fields never use omitempty: false is a semantically meaningful
	// domain value (e.g. active=false means soft-deleted; published=false
	// means draft). Omitting it makes a soft-deleted entity indistinguishable
	// from a hard-deleted one for callers relying on the response body (#1044).
	Completed bool      `json:"completed"`
	LearnerID string    `json:"learner_id"`
	LessonID  string    `json:"lesson_id"`
	Score     int       `json:"score,omitempty"`
	Total     int       `json:"total,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
