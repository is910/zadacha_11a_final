// ==================================================================
// СИМУЛИРАНИ ДАННИ
// ==================================================================
// Детерминистичен генератор (mulberry32 с фиксиран seed): при всяко
// пускане се получават ЕДНИ И СЪЩИ симулирани резервации, което прави
// демото възпроизводимо. Данните се създават чрез СЪЩАТА логика за
// конфликти, която ползва приложението — така те са винаги коректни
// и служат като "жив" тест на алгоритъма при ~150 записа.
// ==================================================================

import { BUSINESS_CONFIGS, maxBookingSpanMs } from '../config/businessConfigs.js';
import { getWorkingHours } from '../logic/slots.js';
import { findConflicts, insertSorted } from '../logic/conflicts.js';
import { atMinutes, addDaysKey, todayKey, MIN } from '../utils/time.js';

// Бърз детерминистичен ГПСЧ (public domain, Mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ['Иван', 'Мария', 'Георги', 'Стоян', 'Елена', 'Николай', 'Даниела', 'Петър', 'Виктория', 'Александър', 'Христина', 'Димитър', 'Рада', 'Мартин', 'Теодора', 'Кирил', 'Габриела', 'Борис'];
const LAST_NAMES = ['Иванов', 'Георгиева', 'Димитров', 'Петрова', 'Стоянов', 'Тодорова', 'Маринов', 'Василева', 'Христов', 'Колева', 'Николов', 'Станева'];

function pickRandom(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// Генерира резервации за следващите 10 дни за ВСЯКА конфигурация.
export function generateSimulatedBookings(nowMs = Date.now()) {
  const rand = mulberry32(20261119);
  const today = todayKey();
  const result = [];

  for (const config of BUSINESS_CONFIGS) {
    const spanMs = maxBookingSpanMs(config);
    // Локален сортиран индекс за всеки ресурс — генераторът спазва същите
    // правила за припокриване като приложението.
    const indexByResource = new Map(config.resources.map((r) => [r.id, []]));

    for (let dayOffset = 0; dayOffset <= 9; dayOffset++) {
      const dateKey = addDaysKey(today, dayOffset);
      const wh = getWorkingHours(config, dateKey);
      if (!wh) continue; // почивен ден — няма данни

      // Днес малко резервации, за да има свободни часове за демото.
      const perDay = dayOffset === 0 ? 3 : 3 + Math.floor(rand() * 4);

      for (let i = 0; i < perDay; i++) {
        const resource = pickRandom(rand, config.resources);
        const hasServices = config.services && config.services.length > 0;
        const service = hasServices ? pickRandom(rand, config.services) : null;
        const durationMin = hasServices ? service.durationMin : (config.defaultDurationMin || 60);
        const g = config.slotGranularityMin;

        const maxStartMin = wh.endMin - durationMin;
        if (maxStartMin <= wh.startMin) continue;

        // Начало, подравнено към мрежата от слотове.
        const gridSteps = Math.floor((maxStartMin - wh.startMin) / g);
        const startMin = wh.startMin + Math.floor(rand() * (gridSteps + 1)) * g;
        const start = atMinutes(dateKey, startMin);
        const end = start + durationMin * MIN;

        // Не симулираме резервации, нарушаващи правилото за предварителност.
        if (start < nowMs + config.leadTimeMin * MIN) continue;

        const sorted = indexByResource.get(resource.id);
        const seatsUsed = resource.capacity > 1 ? 1 + Math.floor(rand() * resource.capacity) : 1;
        const { canBook } = findConflicts(sorted, start, end, {
          maxSpanMs: spanMs,
          capacity: resource.capacity,
          newSeats: seatsUsed,
        });
        if (!canBook) continue; // конфликт — пропускаме опита

        const booking = {
          id: 'sim-' + config.id + '-' + result.length,
          businessId: config.id,
          resourceId: resource.id,
          serviceId: hasServices ? service.id : null,
          title: hasServices ? service.name : (config.bookingTitles ? pickRandom(rand, config.bookingTitles) : 'Резервация'),
          customer: pickRandom(rand, FIRST_NAMES) + ' ' + pickRandom(rand, LAST_NAMES),
          phone: '088' + Math.floor(1000000 + rand() * 8999999),
          note: '',
          start,
          end,
          dateKey,
          seatsUsed,
        };
        insertSorted(sorted, booking);
        result.push(booking);
      }
    }
  }

  return result;
}
