import { memo } from 'react';
import { hhmmFromMinutes, formatDayLabel } from '../utils/time.js';

const STATUS_TITLES = {
  free: 'Свободен — щракнете, за да резервирате',
  full: 'Зает в този момент',
  past: 'Минало време',
  'too-early': 'Твърде рано — нужна е предварителност',
};

// Отделен чип (слот) — MEMOИЗИРАН: преизчертава се само ако се промени
// статусът/часът. Обработчикът onSelect е стабилен (useCallback в App),
// а слотовите обекти са стабилни, докато данните не се променят.
const SlotChip = memo(function SlotChip({ slot, onSelect }) {
  const disabled = slot.status !== 'free';
  return (
    <button
      className={'chip ' + slot.status}
      disabled={disabled}
      title={STATUS_TITLES[slot.status] || ''}
      onClick={disabled ? undefined : () => onSelect(slot)}
    >
      {hhmmFromMinutes(slot.startMin)}
      {slot.capacityLeft > 1 && <span className="chip-cap">{slot.capacityLeft}</span>}
    </button>
  );
});

// Мрежа от слотове за избрания ресурс и ден.
function SlotGrid({ slots, resource, dateKey, onSelectSlot }) {
  if (!resource) {
    return (
      <section className="panel">
        <h2>Часове</h2>
        <p className="empty">Няма избран ресурс.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Часове за {resource.name}</h2>
        <span className="panel-sub">{formatDayLabel(dateKey)}</span>
      </div>

      {slots.length === 0 ? (
        <p className="empty">Почивен ден за този бизнес — няма работно време.</p>
      ) : (
        <>
          <div className="slot-grid">
            {slots.map((s) => (
              <SlotChip key={s.start} slot={s} onSelect={onSelectSlot} />
            ))}
          </div>
          <div className="legend">
            <span className="chip free">свободен</span>
            <span className="chip full">зает</span>
            <span className="chip too-early">твърде рано</span>
            <span className="chip past">минал</span>
          </div>
        </>
      )}
    </section>
  );
}

export default memo(SlotGrid);
