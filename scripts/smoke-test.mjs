// ==================================================================
// SMOKE ТЕСТОВЕ ЗА ЧИСТАТА ЛОГИКА (без браузър, чист Node)
// Пускане: npm run test:logic
// Проверяват: времевите функции, бинарното търсене на конфликти
// (вкл. "подвития" случай с по-ран ДЪЛЪГ интервал), капацитета,
// генерирането и оцветяването на слотове, валидацията и целостта
// на симулираните данни (работно време, lead time, капацитет).
// ==================================================================

import { lowerBound, overlaps, findConflicts, insertSorted, findNextFreeStart } from '../src/logic/conflicts.js';
import { generateSlots, decorateSlots, getWorkingHours } from '../src/logic/slots.js';
import { validateBookingDraft } from '../src/logic/validation.js';
import { BUSINESS_CONFIGS, getBusinessConfig, maxBookingSpanMs } from '../src/config/businessConfigs.js';
import { generateSimulatedBookings } from '../src/data/simulatedData.js';
import { atMinutes, minutesFromHHMM, dateToKey, MIN } from '../src/utils/time.js';

let passed = 0;
let failed = 0;

function check(name, cond) {
  if (cond) {
    passed += 1;
    console.log('  PASS  ' + name);
  } else {
    failed += 1;
    console.error('  FAIL  ' + name);
  }
}

function section(title) {
  console.log('\n== ' + title + ' ==');
}

// Проверка: в който и да е момент, заетите места не превишават капацитета.
function capacityHolds(list, capacity) {
  const events = [];
  for (const b of list) {
    events.push([b.start, b.seatsUsed || 1]);
    events.push([b.end, -(b.seatsUsed || 1)]);
  }
  events.sort((x, y) => x[0] - y[0] || x[1] - y[1]); // краевете преди началата
  let cur = 0;
  for (const [, d] of events) {
    cur += d;
    if (cur > capacity) return false;
  }
  return true;
}

const D = '2026-01-05'; // понеделник
const at = (m) => atMinutes(D, m);

// --- 1. Време ---
section('Времеви функции');
check("minutesFromHHMM('08:30') = 510", minutesFromHHMM('08:30') === 510);
check('atMinutes дава 08:30 локално', new Date(at(510)).getHours() === 8 && new Date(at(510)).getMinutes() === 30);

// --- 2. Конфликти ---
section('Конфликти (сортиран масив + бинарно търсене)');
const arr = [];
check('lowerBound върху празен масив', lowerBound(arr, 123) === 0);
check('overlaps: базови случаи', overlaps(0, 10, 9, 20) === true && overlaps(0, 10, 10, 20) === false && overlaps(10, 20, 0, 10) === false);

insertSorted(arr, { id: 'long', start: at(9 * 60), end: at(12 * 60), seatsUsed: 1 });
check('insertSorted пази нарастващ ред', arr.length === 1 && arr[0].id === 'long');

const r1 = findConflicts(arr, at(10 * 60), at(10 * 60 + 30), { maxSpanMs: 4 * 60 * MIN });
check('конфликт с по-ран ДЪЛЪГ интервал (критичен случай)', r1.conflicts.length === 1 && !r1.canBook);

const r2 = findConflicts(arr, at(12 * 60), at(12 * 60 + 30), { maxSpanMs: 4 * 60 * MIN });
check('без конфликт веднага след края (полуотворени интервали)', r2.conflicts.length === 0 && r2.canBook);

const r3 = findConflicts(arr, at(9 * 60), at(9 * 60 + 30), { maxSpanMs: 4 * 60 * MIN, excludeId: 'long' });
check('excludeId игнорира собствената резервация (промяна на час)', r3.canBook);

const room = [];
insertSorted(room, { id: 'a', start: at(9 * 60), end: at(11 * 60), seatsUsed: 3 });
insertSorted(room, { id: 'b', start: at(10 * 60), end: at(12 * 60), seatsUsed: 3 });
const c1 = findConflicts(room, at(10 * 60), at(11 * 60), { maxSpanMs: 4 * 60 * MIN, capacity: 8, newSeats: 3 });
check('капацитет 8, заети 6 + искани 3 -> отказ', !c1.canBook && c1.usedSeats === 6);
const c2 = findConflicts(room, at(10 * 60), at(11 * 60), { maxSpanMs: 4 * 60 * MIN, capacity: 8, newSeats: 2 });
check('капацитет 8, заети 6 + искани 2 -> ОК', c2.canBook);

const gaps = [];
insertSorted(gaps, { id: 'x', start: at(9 * 60), end: at(10 * 60), seatsUsed: 1 });
insertSorted(gaps, { id: 'y', start: at(11 * 60), end: at(12 * 60), seatsUsed: 1 });
const next = findNextFreeStart(gaps, at(9 * 60), 45 * MIN, at(18 * 60), { maxSpanMs: 4 * 60 * MIN, alignMs: 15 * MIN });
check('findNextFreeStart намира празнина в 10:00', next === at(10 * 60));
const none = findNextFreeStart(gaps, at(17 * 60), 90 * MIN, at(18 * 60), { maxSpanMs: 4 * 60 * MIN, alignMs: 15 * MIN });
check('findNextFreeStart връща null, когато няма място', none === null);

// --- 3. Слотове ---
section('Слотове');
const dental = getBusinessConfig('dental');
const slots = generateSlots(dental, D);
check('38 слота за 08:30–18:00 при грануларност 15', slots.length === 38 && slots[0].startMin === 510);
check('почивен ден -> 0 слота', generateSlots(dental, '2026-01-10').length === 0);

const dayBookings = [];
insertSorted(dayBookings, { id: 'p', start: at(10 * 60), end: at(11 * 60), seatsUsed: 1 });
const decorated = decorateSlots(slots, dayBookings, { nowMs: 0, leadTimeMin: 0, capacity: 1 });
check('слотовете 10:00–11:00 са заети (4 броя)', decorated.filter((s) => s.status === 'full').length === 4);
check('останалите са свободни (34 броя)', decorated.filter((s) => s.status === 'free').length === 34);

// --- 4. Валидация ---
section('Валидация');
function nextMondayKey() {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 1);
  return dateToKey(d);
}
const now = Date.now();
const monKey = nextMondayKey();
const atM = (m) => atMinutes(monKey, m);
const dentalResource = dental.resources[0];

const vOk = validateBookingDraft(dental, dentalResource, { customer: 'Иван Иванов', dateKey: monKey, startMs: atM(9 * 60), endMs: atM(9 * 60 + 30) }, { nowMs: now, dayBookings: [] });
check('коректна чернова минава', vOk.ok);

const vName = validateBookingDraft(dental, dentalResource, { customer: ' ', dateKey: monKey, startMs: atM(9 * 60), endMs: atM(9 * 60 + 30) }, { nowMs: now, dayBookings: [] });
check('липсващо име -> грешка', !vName.ok && vName.errors.some((e) => e.indexOf('име') !== -1));

const vConflict = validateBookingDraft(dental, dentalResource, { customer: 'Иван', dateKey: monKey, startMs: atM(9 * 60), endMs: atM(9 * 60 + 30) }, { nowMs: now, dayBookings: [{ id: 'z', start: atM(9 * 60), end: atM(10 * 60), seatsUsed: 1 }] });
check('припокриване -> грешка', !vConflict.ok);

const vHours = validateBookingDraft(dental, dentalResource, { customer: 'Иван', dateKey: monKey, startMs: atM(17 * 60 + 30), endMs: atM(18 * 60 + 30) }, { nowMs: now, dayBookings: [] });
check('извън работно време -> грешка', !vHours.ok);

// --- 5. Конфигурации и симулирани данни ---
section('Конфигурации и симулирани данни');
check('има поне 3 бизнес конфигурации', BUSINESS_CONFIGS.length >= 3);
check('maxBookingSpanMs(dental) = 90 минути', maxBookingSpanMs(dental) === 90 * MIN);

const now2 = Date.now();
const sims = generateSimulatedBookings(now2);
check('има достатъчно симулирани резервации (>= 40)', sims.length >= 40);
check('всяка симулирана резервация приключва в бъдещето', sims.every((b) => b.end > now2));

let hoursOk = true;
let leadOk = true;
for (const b of sims) {
  const cfg = getBusinessConfig(b.businessId);
  const wh = getWorkingHours(cfg, b.dateKey);
  const startMin = Math.round((b.start - atMinutes(b.dateKey, 0)) / MIN);
  const endMin = Math.round((b.end - atMinutes(b.dateKey, 0)) / MIN);
  if (!wh || startMin < wh.startMin || endMin > wh.endMin) hoursOk = false;
  if (b.start < now2 + cfg.leadTimeMin * MIN) leadOk = false;
}
check('симулираните данни спазват работното време', hoursOk);
check('симулираните данни спазват lead time', leadOk);

let capOk = true;
const groups = new Map();
for (const b of sims) {
  const key = b.businessId + '|' + b.resourceId + '|' + b.dateKey;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(b);
}
for (const [key, list] of groups) {
  const parts = key.split('|');
  const cfg = getBusinessConfig(parts[0]);
  const res = cfg.resources.find((r) => r.id === parts[1]);
  if (!capacityHolds(list, res.capacity)) capOk = false;
}
check('симулираните данни не превишават капацитета на ресурсите', capOk);

console.log('\nРезултат: ' + passed + ' PASS, ' + failed + ' FAIL');
process.exit(failed === 0 ? 0 : 1);
