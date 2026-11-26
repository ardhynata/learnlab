package question

import (
	"time"
)

// DomainEvent is the base contract every domain event implements.
// Services publish values of concrete event types defined below; the
// in-process bus routes them to any handler registered against their
// event-name string.
type DomainEvent interface {
	EventName() string
	OccurredAt() time.Time
}
