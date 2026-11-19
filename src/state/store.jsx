import { createContext, useContext, useMemo, useReducer } from 'react';
import { BUSINESS_CONFIGS, getBusinessConfig } from '../config/businessConfigs.js';
import { generateSimulatedBookings } from '../data/simulatedData.js';
import { insertSorted } from '../logic/conflicts.js';
import { todayKey, dateToKey } from '../utils/time.js';

// ==================================================================
// ЦЕНТРАЛИЗИРАНО СЪСТОЯНИЕ (Context + useReducer)
// ==================================================================
// Чисто управление на състоянието:
//   - reducer-ът е ЧИСТА функция, действията са плоски обекти;
//   - състоянието е НОРМАЛИЗИРАНО: резервациите живеят в обект по id
//     (O(1) достъп, копира се само засегнатият запис);
//   - индексът "ресурс + ден -> сортиран масив" НЕ се пази в reducer-а,
//     а се ИЗВЛИЦА (derive) с useMemo — строи се веднъж при промяна на
//     резервациите (O(N log N) при ~150 записа), не на всеки рендер;
//   - идемпотентни действия: повтарящи се ADD/SET не създават нов обект
//     -> React пропуска рендер (стабилна референция на state).
// ==================================================================

const BookingStoreContext = createContext(null);

const EMPTY = Object.freeze([]);

function buildInitialState() {
  const byId = {};
  for (const b of generateSimulatedBookings()) byId[b.id] = b;
  return {
    businessId: BUSINESS_CONFIGS[0].id,
    dateKey: todayKey(),
    bookings: { byId, allIds: Object.keys(byId) },
  };
}

// Индекс: "${businessId}|${resourceId}|${dateKey}" -> сортиран по start масив.
function buildResourceIndex(byId) {
  const index = new Map();
  for (const id of Object.keys(byId)) {
    const b = byId[id];
    const key = b.businessId + '|' + b.resourceId + '|' + b.dateKey;
    let arr = index.get(key);
    if (!arr) index.set(key, (arr = []));
    insertSorted(arr, b);
  }
  return index;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BUSINESS':
      if (state.businessId === action.businessId) return state;
      return { ...state, businessId: action.businessId };

    case 'SET_DATE':
      if (state.dateKey === action.dateKey) return state;
      return { ...state, dateKey: action.dateKey };

    case 'ADD_BOOKING': {
      const b = action.booking;
      if (state.bookings.byId[b.id]) return state; // идемпотентност
      // dateKey се извлича от start (деня на резервацията) — нужен за индекса.
      const rec = b.dateKey ? b : { ...b, dateKey: dateToKey(new Date(b.start)) };
      return {
        ...state,
        bookings: {
          byId: { ...state.bookings.byId, [rec.id]: rec },
          allIds: state.bookings.allIds.concat(rec.id),
        },
      };
    }

    case 'RESCHEDULE_BOOKING': {
      const prev = state.bookings.byId[action.id];
      if (!prev) return state;
      const patch = { ...action.patch };
      if (patch.start != null) patch.dateKey = dateToKey(new Date(patch.start));
      const next = { ...prev, ...patch };
      return {
        ...state,
        bookings: {
          byId: { ...state.bookings.byId, [next.id]: next },
          allIds: state.bookings.allIds,
        },
      };
    }

    case 'CANCEL_BOOKING': {
      if (!state.bookings.byId[action.id]) return state;
      const byId = { ...state.bookings.byId };
      delete byId[action.id];
      return {
        ...state,
        bookings: { byId, allIds: state.bookings.allIds.filter((id) => id !== action.id) },
      };
    }

    default:
      return state;
  }
}

export function BookingStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const index = useMemo(() => buildResourceIndex(state.bookings.byId), [state.bookings.byId]);
  // dispatch от useReducer е СТАБИЛНА референция — включваме го в value,
  // за да е достъпен за всички компоненти през Context.
  const value = useMemo(() => ({ ...state, index, dispatch }), [state, index]);
  return <BookingStoreContext.Provider value={value}>{children}</BookingStoreContext.Provider>;
}

export function useBookingStore() {
  return useContext(BookingStoreContext);
}

// Конфигурацията на текущия бизнес — мемоизирана по id.
export function useBusinessConfig() {
  const { businessId } = useBookingStore();
  return useMemo(() => getBusinessConfig(businessId), [businessId]);
}

// Сортираните резервации за (бизнес, ресурс, ден). Връща СТАБИЛНА референция
// (празен замразен масив при липса на данни), което позволява ефективна
// мемоизация надолу по веригата (useMemo / React.memo).
export function useDayBookings(resourceId, dateKey) {
  const { businessId, index } = useBookingStore();
  return useMemo(
    () => (resourceId ? index.get(businessId + '|' + resourceId + '|' + dateKey) || EMPTY : EMPTY),
    [index, businessId, resourceId, dateKey]
  );
}

// Брой резервации за текущия бизнес (за статистическата лента).
export function useBusinessBookingCount() {
  const { businessId, bookings } = useBookingStore();
  return useMemo(() => {
    let n = 0;
    for (const id of bookings.allIds) if (bookings.byId[id].businessId === businessId) n += 1;
    return n;
  }, [businessId, bookings]);
}
