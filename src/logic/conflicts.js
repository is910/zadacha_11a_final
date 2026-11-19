// ==================================================================
// АЛГОРИТМИ ЗА КОНФЛИКТИ И ПРИПОКРИВАНИЯ
// ==================================================================
// Ключова оптимизация: за всеки (бизнес, ресурс, ден) резервациите се
// пазят в МАСИВ, СОРТИРАН ПО НАЧАЛО. Тогава:
//   - проверка за конфликт = бинарно търсене (lowerBound) на най-ранния
//     възможен кандидат + обход само на малък "прозорец" кандидати
//     -> O(log n + k) вместо O(n) пълен скан;
//   - вмъкване на нова резервация на правилното място -> O(log n) търсене.
//
// Правилност: резервация с продължителност по-голяма от maxSpanMs не съществува
// (maxSpanMs идва от конфигурацията = най-дългата услуга/продължителност).
// Затова всеки интервал, припокриващ [start, end), задължително започва
// след (start - maxSpanMs) — това ограничава долната граница на търсенето.
// ==================================================================

import { MIN } from '../utils/time.js';

// Първи индекс, за който arr[i].start >= target (lower bound). O(log n).
export function lowerBound(arr, target) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].start < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Припокриване на полуотворени интервали [aStart, aEnd) и [bStart, bEnd).
// Директно долепяне (aEnd == bStart) НЕ е припокриване.
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Намира резервациите, припокриващи се с [startMs, endMs), в сортиран масив.
// options:
//   excludeId  - резервация, която да се игнорира (при промяна на час)
//   maxSpanMs  - максимална дължина на резервация за тази конфигурация
//   capacity   - капацитет на ресурса (за залите: места)
//   newSeats   - колко места заема новата резервация
// Връща { conflicts, usedSeats, canBook }.
export function findConflicts(sortedByStart, startMs, endMs, options = {}) {
  const {
    excludeId = null,
    maxSpanMs = 24 * 60 * MIN,
    capacity = 1,
    newSeats = 1,
  } = options;

  const from = lowerBound(sortedByStart, startMs - maxSpanMs);
  const conflicts = [];
  let usedSeats = 0;

  for (let i = from; i < sortedByStart.length; i++) {
    const b = sortedByStart[i];
    if (b.start >= endMs) break; // всички нататък започват след интервала
    if (excludeId && b.id === excludeId) continue;
    if (overlaps(startMs, endMs, b.start, b.end)) {
      conflicts.push(b);
      usedSeats += b.seatsUsed || 1;
    }
  }

  return {
    conflicts,
    usedSeats,
    canBook: usedSeats + newSeats <= capacity,
  };
}

// Вмъкване на резервация, пазейки масива сортиран по начало. O(log n) търсене.
export function insertSorted(arr, booking) {
  const idx = lowerBound(arr, booking.start);
  arr.splice(idx, 0, booking);
  return arr;
}

// Първият свободен начален момент >= fromMs за интервал с дадена дължина,
// до граница limitMs. Използва findConflicts и "скача" след края на последния
// конфликтен интервал. alignMs подравнява началата към мрежата от слотове.
export function findNextFreeStart(sortedByStart, fromMs, durationMs, limitMs, options = {}) {
  const {
    maxSpanMs = 24 * 60 * MIN,
    capacity = 1,
    newSeats = 1,
    alignMs = 0,
    excludeId = null,
  } = options;

  let t = fromMs;
  if (alignMs > 0) t = Math.ceil(t / alignMs) * alignMs;

  for (let guard = 0; guard < 1000; guard++) {
    if (t + durationMs > limitMs) return null;
    const { canBook, conflicts } = findConflicts(sortedByStart, t, t + durationMs, {
      maxSpanMs, capacity, newSeats, excludeId,
    });
    if (canBook) return t;
    let maxEnd = t;
    for (const b of conflicts) if (b.end > maxEnd) maxEnd = b.end;
    t = maxEnd;
    if (alignMs > 0) t = Math.ceil(t / alignMs) * alignMs;
  }
  return null;
}
