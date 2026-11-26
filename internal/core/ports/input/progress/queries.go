package progressport

type GetProgressByIDQuery struct {
	ID string
}
type ListProgressQuery struct {
	Limit  int
	Offset int
}

// ListProgressByLearnerQuery carries the per-Learner listing
// parameters (#403 sub-3). The LearnerID is path-bound on the REST
// route GET .../progresses/by-learner/{id};
// limit / offset come from the same `?limit=&offset=` query string the
// plain List query reads.
type ListProgressByLearnerQuery struct {
	LearnerID string
	Limit     int
	Offset    int
}

// ListProgressByLessonQuery carries the per-Lesson listing
// parameters (#403 sub-3). The LessonID is path-bound on the REST
// route GET .../progresses/by-lesson/{id};
// limit / offset come from the same `?limit=&offset=` query string the
// plain List query reads.
type ListProgressByLessonQuery struct {
	LessonID string
	Limit    int
	Offset   int
}
