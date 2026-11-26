package learnerport

import "context"

// LearnerService is the inbound port describing the Learner use-cases.
// Implementations live in internal/core/service/learner.
type LearnerService interface {
	Create(ctx context.Context, cmd CreateLearnerCommand) (*LearnerResponse, error)
	GetByID(ctx context.Context, q GetLearnerByIDQuery) (*LearnerResponse, error)
	List(ctx context.Context, q ListLearnerQuery) ([]*LearnerResponse, error)
	Options(ctx context.Context, q LearnerOptionsQuery) ([]LearnerOption, error)
	Update(ctx context.Context, cmd UpdateLearnerCommand) (*LearnerResponse, error)
	Delete(ctx context.Context, cmd DeleteLearnerCommand) error
}
