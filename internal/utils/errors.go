package utils

import "errors"

var (
	ErrSeatAlreadyTaken        = errors.New("some seats are already taken")
	ErrOrderNotPending         = errors.New("order is not in pending status")
	ErrOrderExpired            = errors.New("order has expired")
	ErrQueueNotAllowed         = errors.New("you are not allowed to book yet, please join the queue")
	ErrTicketNotFound          = errors.New("ticket not found")
	ErrTicketAlreadyCheckedIn  = errors.New("ticket has already been checked in")
	ErrEventNotFound           = errors.New("event not found")
	ErrEventNotPublished       = errors.New("event is not published")
	ErrInvalidSeatSelection    = errors.New("invalid seat selection")
	ErrOrderNotFound           = errors.New("order not found")
)
