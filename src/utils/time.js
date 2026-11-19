// ------------------------------------------------------------------
// Помощни функции за време. Приложението работи с две представления:
//   - "минута от деня" (0..1439) — за работно време, слотове, филтри;
//   - epoch милисекунди (Date.getTime()) — за резервации и сравнения.
// Всички функции са чисти и могат да се тестват с Node (без браузър).
// ------------------------------------------------------------------

// Брой милисекунди в една минута.
export const MIN = 60 * 1000;

export function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

// '08:30' -> 510
export function minutesFromHHMM(hhmm) {
  const parts = hhmm.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

// 510 -> '08:30'
export function hhmmFromMinutes(min) {
  return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
}

// Date -> 'YYYY-MM-DD' (локално време)
export function dateToKey(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

// 'YYYY-MM-DD' -> Date в локална полунощ
export function keyToDate(key) {
  const p = key.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

export function todayKey() {
  return dateToKey(new Date());
}

export function addDaysKey(key, days) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dateToKey(d);
}

// Дата (по ключ) в 00:00 + минути от деня -> epoch ms (локално време).
// Работи коректно и за минути > 1440/подравняване (setMinutes пренася).
export function atMinutes(dateKey, minutes) {
  const d = keyToDate(dateKey);
  d.setMinutes(minutes);
  return d.getTime();
}

// Минутите от началото на деня за даден epoch момент.
export function minutesOfDay(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

// '2026-11-19' -> 'четвъртък, 19 ноември' (локален език/часова зона)
export function formatDayLabel(dateKey) {
  return keyToDate(dateKey).toLocaleDateString('bg-BG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Часови диапазон '09:30 – 10:15' от epoch милисекунди.
export function formatTimeRange(startMs, endMs) {
  const s = new Date(startMs);
  const e = new Date(endMs);
  return pad2(s.getHours()) + ':' + pad2(s.getMinutes()) + ' – ' + pad2(e.getHours()) + ':' + pad2(e.getMinutes());
}
