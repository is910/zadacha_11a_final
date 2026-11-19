import { memo } from 'react';
import { formatDayLabel, hhmmFromMinutes } from '../utils/time.js';

// Лента с инструменти: навигация по дата + ФИЛТРИ ЗА НАЛИЧНОСТ
// (търсене по ресурс, "само със свободни часове", времеви диапазон).
// fromMin/toMin = null означава "без ограничение" — няма синхронизация
// на state при смяна на деня, филтрите просто не ограничават нищо.
function Toolbar({
  dateKey, isToday, canGoPrev, canGoNext,
  onPrev, onNext, onToday,
  filters, onFiltersChange, timeOptions,
}) {
  const set = (patch) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="toolbar">
      <div className="date-nav">
        <button onClick={onPrev} disabled={!canGoPrev} aria-label="Предишен ден">&larr;</button>
        <span className="date-label">{formatDayLabel(dateKey)}</span>
        <button onClick={onNext} disabled={!canGoNext} aria-label="Следващ ден">&rarr;</button>
        <button className="ghost" onClick={onToday} disabled={isToday}>Днес</button>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Търси ресурс по име…"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          aria-label="Търсене на ресурс"
        />
        <label className="check">
          <input
            type="checkbox"
            checked={filters.onlyFree}
            onChange={(e) => set({ onlyFree: e.target.checked })}
          />
          Само със свободни часове
        </label>
        <label>
          От
          <select
            value={filters.fromMin == null ? '' : String(filters.fromMin)}
            onChange={(e) => set({ fromMin: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">—</option>
            {timeOptions.map((m) => <option key={m} value={m}>{hhmmFromMinutes(m)}</option>)}
          </select>
        </label>
        <label>
          До
          <select
            value={filters.toMin == null ? '' : String(filters.toMin)}
            onChange={(e) => set({ toMin: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">—</option>
            {timeOptions.map((m) => <option key={m} value={m}>{hhmmFromMinutes(m)}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

export default memo(Toolbar);
