// ==================================================================
// ЦЕНТРАЛИЗИРАНА ВАЛИДАЦИЯ НА РЕЗЕРВАЦИЯ
// ==================================================================
// Всички бизнес правила са на ЕДНО място (лесни за проверка и тест):
//   1. име на клиента;
//   2. lead time — колко предварително трябва да е поискана резервацията;
//   3. хоризонт — максимум N дни напред;
//   4. работно време на конфигурацията за съответния ден;
//   5. припокривания и капацитет (через O(log n + k) алгоритъма).
// ==================================================================

import { getWorkingHours } from './slots.js';
import { findConflicts } from './conflicts.js';
import { maxBookingSpanMs } from '../config/businessConfigs.js';
import { todayKey, addDaysKey, atMinutes, MIN, hhmmFromMinutes } from '../utils/time.js';

export function validateBookingDraft(config, resource, draft, ctx) {
  const errors = [];
  const { dateKey, startMs, endMs } = draft;
  const nowMs = ctx.nowMs;
  const seats = ctx.seats || 1;
  const excludeId = ctx.excludeId || null;

  if (!draft.customer || draft.customer.trim().length < 2) {
    errors.push('Въведете име на клиента (поне 2 символа).');
  }

  // 1) Правило за предварителност и минало време.
  if (startMs < nowMs + config.leadTimeMin * MIN) {
    errors.push('Твърде скоро или в миналото — необходими са поне ' + config.leadTimeMin + ' мин. предварителност.');
  }

  // 2) Хоризонт на резервацията.
  const maxKey = addDaysKey(todayKey(), config.maxAdvanceDays);
  if (dateKey > maxKey) {
    errors.push('Резервации се приемат най-много ' + config.maxAdvanceDays + ' дни напред.');
  }

  // 3) Работно време за този ден от конфигурацията.
  const wh = getWorkingHours(config, dateKey);
  if (!wh) {
    errors.push('Избраният ден е почивен за този бизнес.');
  } else {
    const startMin = Math.round((startMs - atMinutes(dateKey, 0)) / MIN);
    const endMin = Math.round((endMs - atMinutes(dateKey, 0)) / MIN);
    if (endMin <= startMin) {
      errors.push('Некоректна продължителност.');
    } else if (startMin < wh.startMin || endMin > wh.endMin) {
      errors.push('Интервалът излиза извън работното време (' + hhmmFromMinutes(wh.startMin) + '–' + hhmmFromMinutes(wh.endMin) + ').');
    }
  }

  // 4) Припокривания и капацитет.
  const res = findConflicts(ctx.dayBookings || [], startMs, endMs, {
    excludeId,
    maxSpanMs: maxBookingSpanMs(config),
    capacity: resource.capacity,
    newSeats: seats,
  });
  if (!res.canBook) {
    if (resource.capacity > 1) {
      errors.push('Няма достатъчно места: заети ' + res.usedSeats + ' от ' + resource.capacity + ' в този интервал.');
    } else {
      errors.push('Интервалът се припокрива с друга резервация.');
    }
  }

  return { ok: errors.length === 0, errors };
}
