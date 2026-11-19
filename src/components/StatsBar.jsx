// Компактна статистическа лента — "живи" показатели за текущия избор.
function StatsBar({ businessCount, dayCount, freeSlots, totalSlots }) {
  return (
    <div className="stats">
      <span className="stat">Резервации за бизнеса: <b>{businessCount}</b></span>
      <span className="stat">За деня (избран ресурс): <b>{dayCount}</b></span>
      <span className="stat">Свободни слотове: <b>{freeSlots}/{totalSlots}</b></span>
    </div>
  );
}

export default StatsBar;
