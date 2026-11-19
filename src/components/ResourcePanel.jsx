import { memo } from 'react';

// Отделна карта на ресурс — мемоизирана, за да не се преизчертава,
// ако данните за друг ресурс се променят.
const ResourceCard = memo(function ResourceCard({ info, selected, onSelect }) {
  const busyPct = info.totalSlots > 0
    ? Math.round(((info.totalSlots - info.freeSlots) / info.totalSlots) * 100)
    : 0;
  return (
    <button
      className={'resource-card' + (selected ? ' selected' : '')}
      onClick={() => onSelect(info.resource.id)}
    >
      <span className="resource-name">{info.resource.name}</span>
      <span className="resource-meta">
        {info.resource.capacity > 1
          ? 'капацитет: ' + info.resource.capacity + ' места'
          : 'индивидуални резервации'}
      </span>
      <span className="resource-stats">
        {info.freeSlots} свободни слота · {info.bookingsCount} резервации
      </span>
      <span className="bar" aria-hidden="true">
        <span className="bar-fill" style={{ width: busyPct + '%' }} />
      </span>
    </button>
  );
});

// Панел с ресурсите на активната конфигурация. `infos` вече е ФИЛТРИРАН
// списък (търсене + "само свободни"), изчислен с useMemo в App.
function ResourcePanel({ infos, selectedId, onSelect, hiddenCount }) {
  return (
    <aside className="resource-panel">
      <div className="panel-head">
        <h2>Ресурси</h2>
        {hiddenCount > 0 && <span className="panel-sub">скрити от филтрите: {hiddenCount}</span>}
      </div>
      {infos.length === 0 ? (
        <p className="empty">Никой ресурс не отговаря на филтрите.</p>
      ) : (
        infos.map((info) => (
          <ResourceCard
            key={info.resource.id}
            info={info}
            selected={info.resource.id === selectedId}
            onSelect={onSelect}
          />
        ))
      )}
    </aside>
  );
}

export default ResourcePanel;
