import { useMemo, useState } from 'react';
import { getWorkingHours } from '../logic/slots.js';
import { findConflicts, findNextFreeStart } from '../logic/conflicts.js';
import { maxBookingSpanMs, candidateDurations } from '../config/businessConfigs.js';
import { validateBookingDraft } from '../logic/validation.js';
import { MIN, atMinutes, hhmmFromMinutes, formatDayLabel, minutesOfDay } from '../utils/time.js';

// ==================================================================
// ДИАЛОГ ЗА СЪЗДАВАНЕ / ПРОМЯНА НА РЕЗЕРВАЦИЯ
// ==================================================================
// Валидацията е централизирана (logic/validation.js) и се извършва
// при запис. При конфликт потребителят получава ясна грешка + бутон
// "Покажи първия свободен час", който използва findNextFreeStart.
// Списъкът с валидни начални часове за деня е МЕМОИЗИРАН и
// преизчислен само при промяна на услуга/продължителност/места.
// ==================================================================
export default function BookingDialog({
  config, resource, dateKey, dayBookings, nowMs,
  mode, booking, initialStart,
  onClose, onSaveCreate, onSaveReschedule,
}) {
  const isReschedule = mode === 'reschedule';
  const services = config.services || [];
  const hasServices = services.length > 0;

  const [serviceId, setServiceId] = useState(() => (booking && booking.serviceId) || (services[0] ? services[0].id : null));
  const [durationMin, setDurationMin] = useState(() => (booking ? Math.round((booking.end - booking.start) / MIN) : (config.defaultDurationMin || 60)));
  const [startMs, setStartMs] = useState(() => (booking ? booking.start : initialStart) || Date.now());
  const [customer, setCustomer] = useState(booking ? booking.customer : '');
  const [phone, setPhone] = useState(booking ? booking.phone || '' : '');
  const [note, setNote] = useState(booking ? booking.note || '' : '');
  const [seats, setSeats] = useState(booking ? booking.seatsUsed || 1 : 1);
  const [errors, setErrors] = useState([]);

  const service = hasServices ? (services.find((s) => s.id === serviceId) || null) : null;
  const duration = hasServices ? (service ? service.durationMin : (config.defaultDurationMin || 60)) : durationMin;
  const endMs = startMs + duration * MIN;

  // Общи параметри за проверка на конфликти (стабилен обект за useMemo).
  const conflictOptions = useMemo(() => ({
    maxSpanMs: maxBookingSpanMs(config),
    capacity: resource.capacity,
    newSeats: resource.capacity > 1 ? seats : 1,
    excludeId: booking ? booking.id : null,
  }), [config, resource, seats, booking]);

  // Валидни свободни начала за деня при текущата продължителност.
  const candidateStarts = useMemo(() => {
    const wh = getWorkingHours(config, dateKey);
    if (!wh) return [];
    const out = [];
    for (let m = wh.startMin; m + duration <= wh.endMin; m += config.slotGranularityMin) {
      const s = atMinutes(dateKey, m);
      if (s < nowMs + config.leadTimeMin * MIN) continue;
      const { canBook } = findConflicts(dayBookings, s, s + duration * MIN, conflictOptions);
      if (canBook) out.push(s);
    }
    return out;
  }, [config, dateKey, duration, nowMs, dayBookings, conflictOptions]);

  // Автоматично търсене на първия свободен час (скача след конфликтите).
  const suggestNextFree = () => {
    const wh = getWorkingHours(config, dateKey);
    if (!wh) return;
    const from = Math.max(startMs, nowMs + config.leadTimeMin * MIN);
    const t = findNextFreeStart(dayBookings, from, duration * MIN, atMinutes(dateKey, wh.endMin), {
      ...conflictOptions,
      alignMs: config.slotGranularityMin * MIN,
    });
    if (t) {
      setStartMs(t);
      setErrors([]);
    } else {
      setErrors(['Няма свободен интервал до края на работния ден.']);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const draft = {
      customer,
      phone,
      note,
      serviceId: hasServices ? serviceId : null,
      dateKey,
      startMs,
      endMs,
    };
    const v = validateBookingDraft(config, resource, draft, {
      nowMs,
      dayBookings,
      seats: resource.capacity > 1 ? seats : 1,
      excludeId: booking ? booking.id : null,
    });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    const patch = {
      customer: customer.trim(),
      phone: phone.trim(),
      note: note.trim(),
      serviceId: hasServices ? serviceId : null,
      title: (hasServices && service) ? service.name : (booking ? booking.title : 'Резервация'),
      start: startMs,
      end: endMs,
      seatsUsed: resource.capacity > 1 ? seats : 1,
    };
    if (isReschedule) onSaveReschedule(booking.id, patch);
    else onSaveCreate(patch);
  };

  const currentLabel = hhmmFromMinutes(minutesOfDay(startMs)) + ' – ' + hhmmFromMinutes(minutesOfDay(endMs));

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{isReschedule ? 'Промяна на резервация' : 'Нова резервация'}</h2>
        <p className="dialog-sub">
          {resource.name} · {formatDayLabel(dateKey)} · {currentLabel}
        </p>

        {hasServices ? (
          <label className="field">
            Услуга
            <select value={serviceId || ''} onChange={(e) => { setServiceId(e.target.value); setErrors([]); }}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.durationMin} мин)</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            Продължителност
            <select value={durationMin} onChange={(e) => { setDurationMin(Number(e.target.value)); setErrors([]); }}>
              {candidateDurations(config).map((d) => (
                <option key={d} value={d}>{d} минути</option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          Промени часа (валидни свободни начала)
          <select
            value=""
            onChange={(e) => { if (e.target.value) { setStartMs(Number(e.target.value)); setErrors([]); } }}
          >
            <option value="">{currentLabel} (текущ избор)</option>
            {candidateStarts.map((s) => (
              <option key={s} value={s}>
                {hhmmFromMinutes(minutesOfDay(s))} – {hhmmFromMinutes(minutesOfDay(s + duration * MIN))}
              </option>
            ))}
          </select>
        </label>

        {resource.capacity > 1 && (
          <label className="field">
            Брой места (капацитет {resource.capacity})
            <select value={seats} onChange={(e) => { setSeats(Number(e.target.value)); setErrors([]); }}>
              {Array.from({ length: resource.capacity }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          Име на клиента *
          <input
            type="text"
            value={customer}
            placeholder="Например: Мария Иванова"
            onChange={(e) => setCustomer(e.target.value)}
            autoFocus
          />
        </label>

        <label className="field">
          Телефон (по избор)
          <input
            type="text"
            value={phone}
            placeholder="088Х ХХХХХХ"
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="field">
          Бележка (по избор)
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {errors.length > 0 && (
          <div className="errors">
            <ul>
              {errors.map((er, i) => <li key={i}>{er}</li>)}
            </ul>
            <button type="button" className="ghost" onClick={suggestNextFree}>
              Покажи първия свободен час
            </button>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={onClose}>Отказ</button>
          <button type="submit" className="primary">
            {isReschedule ? 'Запази промяната' : 'Създай резервация'}
          </button>
        </div>
      </form>
    </div>
  );
}
