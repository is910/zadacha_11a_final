import { memo, useMemo } from 'react';
import { formatTimeRange } from '../utils/time.js';

// Един ред резервация — мемоизиран; промяна в друга резервация не го
// преизчертава (стабилни референции на обработчиците + memo).
const BookingRow = memo(function BookingRow({ booking, resource, serviceTitle, canEdit, onReschedule, onCancel }) {
  return (
    <li className="booking-row">
      <span className="row-time">{formatTimeRange(booking.start, booking.end)}</span>
      <span className="row-main">
        <b>{booking.customer}</b>
        <small>
          {serviceTitle}
          {resource.capacity > 1 ? ' · ' + booking.seatsUsed + ' места' : ''}
          {booking.phone ? ' · ' + booking.phone : ''}
          {booking.note ? ' · ' + booking.note : ''}
        </small>
      </span>
      {canEdit ? (
        <span className="row-actions">
          <button className="ghost" onClick={() => onReschedule(booking)}>Премести</button>
          <button className="danger" onClick={() => onCancel(booking)}>Откажи</button>
        </span>
      ) : (
        <span className="row-past">минала</span>
      )}
    </li>
  );
});

// Списък с резервациите за избрания ресурс и ден, сортирани по начало
// (идват вече сортирани от индекса в store-а).
function DayBookings({ bookings, resource, config, nowMs, onReschedule, onCancel }) {
  const serviceMap = useMemo(() => {
    const m = new Map();
    for (const s of config.services || []) m.set(s.id, s.name);
    return m;
  }, [config]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Резервации за {resource.name}</h2>
        <span className="panel-sub">{bookings.length} за деня</span>
      </div>

      {bookings.length === 0 ? (
        <p className="empty">Няма резервации за този ден.</p>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              resource={resource}
              serviceTitle={(b.serviceId && serviceMap.get(b.serviceId)) || b.title || 'Резервация'}
              canEdit={b.end > nowMs}
              onReschedule={onReschedule}
              onCancel={onCancel}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default memo(DayBookings);
