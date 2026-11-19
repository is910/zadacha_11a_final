// ==================================================================
// УНИВЕРСАЛЕН КОНФИГУРИРУЕМ МОДЕЛ НА БИЗНЕС
// ==================================================================
// Системата НЕ съдържа нищо специфично за конкретен бизнес.
// Всичко (ресурси, работно време, грануларност на слотовете, услуги,
// капацитет, правила за предварителност) идва от тук.
// Добавянето на нов тип бизнес = добавяне на НОВ ОБЕКТ в масива,
// без да се пипа нито ред логика или интерфейс.
//
// Полета на конфигурацията:
//   id                  - уникален идентификатор
//   shortLabel          - кратко съкращение за таб/знак
//   name, description   - показват се в интерфейса
//   color               - акцентен цвят на темата за този бизнес
//   slotGranularityMin  - стъпка на мрежата от слотове (мин)
//   defaultDurationMin  - продължителност по подразбиране (без услуги)
//   maxDurationMin      - максимална продължителност (за наем на зали)
//   leadTimeMin         - колко минути предварително е нужна резервацията
//   maxAdvanceDays      - максимален хоризонт напред (дни)
//   workingHours        - по дни от седмицата: 1=пон...6=съб, 0=нед;
//                         ЛИПСВАЩ ключ = почивен ден
//   resources           - резервирани обекти; capacity > 1 = групов ресурс
//   services            - услуги с фиксирана продължителност (може и празен)
//   bookingTitles       - типови названия при бизнес без услуги
// ==================================================================

import { MIN } from '../utils/time.js';

export const BUSINESS_CONFIGS = [
  {
    id: 'dental',
    shortLabel: 'ДЕНТ',
    name: 'Дентален кабинет „Smile“',
    description: 'Два кабинета и рентген стая, услуги с различна продължителност',
    color: '#0f766e',
    slotGranularityMin: 15,
    defaultDurationMin: 30,
    leadTimeMin: 60,
    maxAdvanceDays: 14,
    workingHours: {
      1: { start: '08:30', end: '18:00' },
      2: { start: '08:30', end: '18:00' },
      3: { start: '08:30', end: '18:00' },
      4: { start: '08:30', end: '19:00' },
      5: { start: '08:30', end: '16:00' },
    },
    resources: [
      { id: 'cab1', name: 'Кабинет 1', capacity: 1 },
      { id: 'cab2', name: 'Кабинет 2', capacity: 1 },
      { id: 'xray', name: 'Рентген стая', capacity: 1 },
    ],
    services: [
      { id: 'exam', name: 'Преглед', durationMin: 30 },
      { id: 'filling', name: 'Пломба', durationMin: 60 },
      { id: 'cleaning', name: 'Професионално почистване', durationMin: 45 },
      { id: 'implant', name: 'Консултация за импланти', durationMin: 90 },
    ],
  },
  {
    id: 'salon',
    shortLabel: 'САЛОН',
    name: 'Фризьорски салон „Гламур“',
    description: 'Трима майстори, всяка услуга с различна продължителност',
    color: '#be185d',
    slotGranularityMin: 15,
    defaultDurationMin: 45,
    leadTimeMin: 30,
    maxAdvanceDays: 21,
    workingHours: {
      1: { start: '09:00', end: '19:00' },
      2: { start: '09:00', end: '19:00' },
      3: { start: '09:00', end: '19:00' },
      4: { start: '09:00', end: '19:00' },
      5: { start: '09:00', end: '19:00' },
      6: { start: '10:00', end: '15:00' },
    },
    resources: [
      { id: 'maya', name: 'Мая — старши стилист', capacity: 1 },
      { id: 'ivan', name: 'Иван — бръснач и стилист', capacity: 1 },
      { id: 'poli', name: 'Поли — колорист', capacity: 1 },
    ],
    services: [
      { id: 'haircut', name: 'Подстригване', durationMin: 45 },
      { id: 'color', name: 'Боядисване', durationMin: 120 },
      { id: 'styling', name: 'Укладка', durationMin: 30 },
      { id: 'manicure', name: 'Маникюр', durationMin: 60 },
    ],
  },
  {
    id: 'rooms',
    shortLabel: 'ЗАЛИ',
    name: 'Коворкинг „Синтезис“ — зали за наем',
    description: 'Зали с различен капацитет, резервация на интервали от 30 минути',
    color: '#1d4ed8',
    slotGranularityMin: 30,
    defaultDurationMin: 60,
    maxDurationMin: 240,
    leadTimeMin: 0,
    maxAdvanceDays: 30,
    workingHours: {
      1: { start: '08:00', end: '20:00' },
      2: { start: '08:00', end: '20:00' },
      3: { start: '08:00', end: '20:00' },
      4: { start: '08:00', end: '20:00' },
      5: { start: '08:00', end: '20:00' },
      6: { start: '10:00', end: '14:00' },
    },
    resources: [
      { id: 'small', name: 'Малка зала', capacity: 4 },
      { id: 'team', name: 'Зала „Екип“', capacity: 8 },
      { id: 'big', name: 'Голяма зала', capacity: 20 },
    ],
    services: [],
    bookingTitles: ['Работна среща', 'Презентация', 'Обучение', 'Интервю', 'Работа в екип'],
  },
];

// Търсене на конфигурация по id (с безопасен fallback към първата).
export function getBusinessConfig(id) {
  return BUSINESS_CONFIGS.find((c) => c.id === id) || BUSINESS_CONFIGS[0];
}

// Най-дългата възможна резервация за конфигурацията (в милисекунди).
// Използва се като ГОРНА ГРАНИЦА при търсенето на конфликти: резервация,
// започнала по-рано от (начало - maxSpan), не може да припокрива интервала.
// Това позволява бинарно търсене вместо пълен обход.
export function maxBookingSpanMs(config) {
  const serviceMax = config.services && config.services.length > 0
    ? Math.max(...config.services.map((s) => s.durationMin))
    : 0;
  const minutes = Math.max(serviceMax, config.defaultDurationMin || 0, config.slotGranularityMin);
  return minutes * MIN;
}

// Възможни продължителности при бизнес без услуги (кратни на грануларността).
export function candidateDurations(config) {
  const max = config.maxDurationMin || config.defaultDurationMin || config.slotGranularityMin;
  const out = [];
  for (let d = config.slotGranularityMin; d <= max; d += config.slotGranularityMin) out.push(d);
  return out;
}
