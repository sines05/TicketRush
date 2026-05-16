import React, { createContext, useCallback, useMemo } from 'react';
import { SEAT_STATUS } from '../constants/status.js';

export const BookingContext = createContext(null);

const STORAGE_KEY = 'booking_state';

const initialState = {
  eventId: null,
  selectedSeats: []
};

const getInitialState = () => {
  const saved = window.sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Validate hydrated state
      if (parsed && Array.isArray(parsed.selectedSeats)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse booking state', e);
    }
  }
  return initialState;
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

      const exists = state.selectedSeats.some((s) => (s.seat_id || s.seatId) === seatId);
      if (exists) {
        return {
          ...state,
          selectedSeats: state.selectedSeats.filter((s) => (s.seat_id || s.seatId) !== seatId)
        };
      }

      if (seat.status !== SEAT_STATUS.AVAILABLE) return state;

      return {
        ...state,
        selectedSeats: [...state.selectedSeats, { ...seat, seat_id: seatId }]
      };
    }

    case 'REMOVE_SEATS': {
      const seatIds = action.seatIds;
      if (!Array.isArray(seatIds)) return state;
      return {
        ...state,
        selectedSeats: state.selectedSeats.filter(
          (s) => !seatIds.includes(s.seat_id || s.seatId)
        )
      };
    }

    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, getInitialState);

  React.useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const startBooking = useCallback((newEventId) => {
    dispatch({ type: 'START', eventId: newEventId });
  }, []);

  const clearBooking = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const removeSeats = useCallback((seatIds) => {
    dispatch({ type: 'REMOVE_SEATS', seatIds });
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
      removeSeats,
      isSelected,
      toggleSeat
    };
  }, [
    state.eventId,
    state.selectedSeats,
    startBooking,
    clearBooking,
    clearSelection,
    removeSeats,
    isSelected,
    toggleSeat
  ]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
