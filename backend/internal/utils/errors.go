package utils

import "errors"

var (
	ErrSeatAlreadyTaken = errors.New("some seats are already taken")
	ErrOrderNotPending  = errors.New("order is not in pending status")
	ErrOrderExpired     = errors.New("order has expired")
)
