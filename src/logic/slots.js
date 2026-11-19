// ==================================================================
// ГЕНЕРИРАНЕ И ОЦВЕТЯВАНЕ НА СЛОТОВЕ
// ==================================================================
// Слотовете НИКОГА не се съхраняват в състоянието — винаги се ИЗЧИСЛЯВАТ
// (derive, не sync) от конфигурацията + резервациите за деня.
// decorateSlots прави обединението "слотове × резервации" в ЛИНЕЙНО време
// (техника two-pointer): слотовете и резервациите са сортирани по време,
// така че указател bi се движи само напред -> O(S + n), а не O(S * n).
// ==================================================================

import { keyToDate, minutesFromHHMM, atMinutes, MIN } from '../utils/time.js';

// Работно време за конфигурация и дата. Липсващ ключ = почивен ден.
export function getWorkingHours(config, dateKey) {
  const weekday = keyToDate(dateKey).getDay(); // 0=нед ... 6=съб
  const wh = config.workingHours[weekday];
  if (!wh) return null;
  return {
    startMin: minutesFromHHMM(wh.start),
    endMin: minutesFromHHMM(wh.end),
  };
}

// Мрежа от слотове с грануларността на конфигурацията.
export function generateSlots(config, dateKey) {
  const wh = getWorkingHours(config, dateKey);
  if (!wh) return [];
  const slots = [];
  const g = config.slotGranularityMin;
  for (let m = wh.startMin; m + g <= wh.endMin; m += g) {
    const start = atMinutes(dateKey, m);
    slots.push({ start, end: start + g * MIN, startMin: m, endMin: m + g });
  }
  return slots;
}

// Оцветява слотовете спрямо резервациите за деня за даден ресурс.
// Статуси: 'free' | 'full' | 'past' | 'too-early'.
// capacityLeft > 1 показва оставащите места при групов ресурс.
export function decorateSlots(slots, dayBookings, options = {}) {
  const { nowMs = Date.now(), leadTimeMin = 0, capacity = 1 } = options;
  const result = new Array(slots.length);
  let bi = 0; // указател върху сортираните резервации — движи се само напред

  for (let si = 0; si < slots.length; si++) {
    const s = slots[si];

    // Резервации, приключили преди началото на слота, повече ни интересуват.
    while (bi < dayBookings.length && dayBookings[bi].end <= s.start) bi++;

    let used = 0;
    for (let i = bi; i < dayBookings.length; i++) {
      const b = dayBookings[i];
      if (b.start >= s.end) break; // останалите започват след слота
      if (b.end > s.start) used += b.seatsUsed || 1;
    }

    const inPast = s.end <= nowMs;
    const tooEarly = s.start < nowMs + leadTimeMin * MIN;
    const capacityLeft = Math.max(0, capacity - used);
    const status = inPast ? 'past' : tooEarly ? 'too-early' : capacityLeft > 0 ? 'free' : 'full';

    result[si] = { ...s, capacityLeft, status };
  }

  return result;
}
