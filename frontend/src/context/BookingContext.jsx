import React, { createContext, useCallback, useMemo, useReducer } from 'react';
import { SEAT_STATUS } from '../constants/status.js';

export const BookingContext = createContext(null);

const initialState = {
  eventId: null,
  selectedSeats: []
};

function reducer(state, action) {
  switch (action.type) {
    case 'START': {
      const nextEventId = action.eventId;
      if (!nextEventId) return state;
      if (state.eventId === nextEventId) return state;
      return { eventId: nextEventId, selectedSeats: [] };
    }

    case 'CLEAR': {
      return initialState;
    }

    case 'CLEAR_SELECTION': {
      return { ...state, selectedSeats: [] };
    }

    case 'TOGGLE_SEAT': {
      const seat = action.seat;
      const seatId = seat?.seat_id || seat?.seatId;
      if (!seatId) return state;
      if (seat.status !== SEAT_STATUS.AVAILABLE) return state;

      const exists = state.selectedSeats.some((s) => (s.seat_id || s.seatId) === seatId);
      return {
        ...state,
        selectedSeats: exists
          ? state.selectedSeats.filter((s) => (s.seat_id || s.seatId) !== seatId)
          : [...state.selectedSeats, { ...seat, seat_id: seatId }]
      };
    }

    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startBooking = useCallback((newEventId) => {
    dispatch({ type: 'START', eventId: newEventId });
  }, []);

  const clearBooking = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const isSelected = useCallback(
    (seatId) => state.selectedSeats.some((s) => (s.seat_id || s.seatId) === seatId),
    [state.selectedSeats]
  );

  const toggleSeat = useCallback(
    (seat) => {
      dispatch({ type: 'TOGGLE_SEAT', seat });
    },
    []
  );

  const value = useMemo(() => {
    return {
      eventId: state.eventId,
      selectedSeats: state.selectedSeats,
      startBooking,
      clearBooking,
      clearSelection,
      isSelected,
      toggleSeat
    };
  }, [
    state.eventId,
    state.selectedSeats,
    startBooking,
    clearBooking,
    clearSelection,
    isSelected,
    toggleSeat
  ]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
