import React from 'react';
import { SEAT_STATUS } from '../../constants/status.js';
import { cn } from '../../lib/utils';

function getSeatClasses({ status, selected, lockedByMe }) {
  if (selected || lockedByMe) {
    return 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-500 ring-offset-1 z-10';
  }

  switch (status) {
    case SEAT_STATUS.AVAILABLE:
      return 'bg-emerald-500/90 text-white hover:bg-emerald-500 hover:scale-110 hover:shadow-lg hover:z-20';
    case SEAT_STATUS.SOLD:
      return 'bg-red-500 text-white cursor-not-allowed opacity-90 border-none';
    case SEAT_STATUS.LOCKED:
      return 'bg-pink-500 text-white cursor-not-allowed opacity-90';
    default:
      return 'bg-pink-500 text-white cursor-not-allowed opacity-90';
  }
}

const Seat = React.memo(function Seat({ seat, selected = false, onClick }) {
  const disabled = seat.status !== SEAT_STATUS.AVAILABLE;
  const label = seat.label || (seat.row_label && seat.seat_number != null ? `${seat.row_label}-${seat.seat_number}` : '');
  const shortLabel = seat.shortLabel || (seat.seat_number != null ? String(seat.seat_number) : '');

  const statusText = seat.status === SEAT_STATUS.AVAILABLE ? 'Trống' : 
                    seat.status === SEAT_STATUS.SOLD ? 'Đã bán' : 'Đang giữ';

  return (
    <button
      type="button"
      aria-label={`Ghế ${label}, ${statusText}${selected ? ', Đang chọn' : ''}`}
      aria-pressed={selected}
      title={`${label} • ${statusText}`}
      disabled={disabled}
      onClick={() => onClick?.(seat)}
      className={cn(
        "h-8 w-8 select-none rounded-md text-[10px] font-bold transition-all duration-300 flex items-center justify-center border border-black/5",
        getSeatClasses({
          status: seat.status,
          selected,
          lockedByMe: seat.lockedByMe
        })
      )}
    >
      {shortLabel || label}
    </button>
  );
});

export default Seat;
