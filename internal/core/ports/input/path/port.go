package pathport

import "context"

// PathService is the inbound port describing the Path use-cases.
// Implementations live in internal/core/service/path.
type PathService interface {
	Create(ctx context.Context, cmd CreatePathCommand) (*PathResponse, error)
	GetByID(ctx context.Context, q GetPathByIDQuery) (*PathResponse, error)
	List(ctx context.Context, q ListPathQuery) ([]*PathResponse, error)
	Options(ctx context.Context, q PathOptionsQuery) ([]PathOption, error)
	Update(ctx context.Context, cmd UpdatePathCommand) (*PathResponse, error)
	Delete(ctx context.Context, cmd DeletePathCommand) error
}
