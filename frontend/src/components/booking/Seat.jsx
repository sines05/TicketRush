import { SEAT_STATUS } from '../../constants/status.js';

function getSeatClasses({ status, selected, lockedByMe }) {
  if (selected || lockedByMe) return 'bg-seat-selected text-black';

  switch (status) {
    case SEAT_STATUS.AVAILABLE:
      return 'bg-seat-available text-black hover:opacity-90';
    case SEAT_STATUS.SOLD:
      return 'bg-seat-sold text-white opacity-80 cursor-not-allowed';
    case SEAT_STATUS.LOCKED:
      return 'bg-seat-locked text-black/70 opacity-80 cursor-not-allowed';
    default:
      return 'bg-seat-locked text-black/70 opacity-80 cursor-not-allowed';
  }
}

export default function Seat({ seat, selected = false, onClick }) {
  const disabled = seat.status !== SEAT_STATUS.AVAILABLE;
  const label = seat.label || (seat.row_label && seat.seat_number != null ? `${seat.row_label}-${seat.seat_number}` : '');
  const shortLabel = seat.shortLabel || (seat.seat_number != null ? String(seat.seat_number) : '');

  return (
    <button
      type="button"
      title={`${label} • ${seat.status}`}
      disabled={disabled}
      onClick={() => onClick?.(seat)}
      className={`h-8 w-8 select-none rounded-md text-[10px] font-semibold transition ${getSeatClasses({
        status: seat.status,
        selected,
        lockedByMe: seat.lockedByMe
      })}`}
    >
      {shortLabel || label}
    </button>
  );
}
