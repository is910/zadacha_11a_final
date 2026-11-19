import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookingStoreProvider,
  useBookingStore,
  useBusinessConfig,
  useDayBookings,
  useBusinessBookingCount,
} from './state/store.jsx';
import { useNow } from './state/useNow.js';
import { todayKey, addDaysKey } from './utils/time.js';
import { generateSlots, decorateSlots, getWorkingHours } from './logic/slots.js';
import BusinessTabs from './components/BusinessTabs.jsx';
import Toolbar from './components/Toolbar.jsx';
import ResourcePanel from './components/ResourcePanel.jsx';
import SlotGrid from './components/SlotGrid.jsx';
import DayBookings from './components/DayBookings.jsx';
import StatsBar from './components/StatsBar.jsx';
import BookingDialog from './components/BookingDialog.jsx';

const EMPTY = Object.freeze([]);

function Shell() {
  const { businessId, dateKey, index, dispatch } = useBookingStore();
  const config = useBusinessConfig();
  const now = useNow(60000);
  const today = todayKey();

  const [selectedResourceId, setSelectedResourceId] = useState(config.resources[0] ? config.resources[0].id : null);
  const [filters, setFilters] = useState({ query: '', onlyFree: false, fromMin: null, toMin: null });
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // При смяна на бизнес конфигурацията връщаме избора към първия ѝ ресурс.
  useEffect(() => {
    setSelectedResourceId(config.resources[0] ? config.resources[0].id : null);
  }, [config]);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Избраният ресурс (с безопасен fallback при смяна на конфигурацията).
  const resource = useMemo(
    () => config.resources.find((r) => r.id === selectedResourceId) || config.resources[0] || null,
    [config, selectedResourceId]
  );

  const dayBookings = useDayBookings(resource ? resource.id : null, dateKey);

  // Слотовете за избрания ресурс — ИЗЧИСЛЯВАТ СЕ (не се съхраняват!) и се
  // мемоизират: преизчисление само при промяна на конфигурация, дата,
  // резервации за деня или минутния "now" таймер.
  const decoratedSlots = useMemo(() => {
    if (!resource) return EMPTY;
    const base = generateSlots(config, dateKey);
    return decorateSlots(base, dayBookings, {
      nowMs: now,
      leadTimeMin: config.leadTimeMin,
      capacity: resource.capacity,
    });
  }, [config, dateKey, dayBookings, now, resource]);

  // Обобщени данни за ВСИЧКИ ресурси (за панела и филтъра "само свободни").
  const resourceInfos = useMemo(() => {
    return config.resources.map((r) => {
      const bookings = index.get(businessId + '|' + r.id + '|' + dateKey) || EMPTY;
      const slots = decorateSlots(generateSlots(config, dateKey), bookings, {
        nowMs: now,
        leadTimeMin: config.leadTimeMin,
        capacity: r.capacity,
      });
      let free = 0;
      for (const s of slots) if (s.status === 'free') free += 1;
      return { resource: r, freeSlots: free, totalSlots: slots.length, bookingsCount: bookings.length };
    });
  }, [config, dateKey, index, businessId, now]);

  // Филтриране на наличността: търсене по име + "само със свободни часове".
  const visibleResources = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return resourceInfos.filter((info) => {
      if (q && info.resource.name.toLowerCase().indexOf(q) === -1) return false;
      if (filters.onlyFree && info.freeSlots === 0) return false;
      return true;
    });
  }, [resourceInfos, filters]);

  // Времеви диапазон на слотовете (филтър "От / До").
  const visibleSlots = useMemo(() => {
    return decoratedSlots.filter((s) =>
      (filters.fromMin == null || s.startMin >= filters.fromMin) &&
      (filters.toMin == null || s.endMin <= filters.toMin)
    );
  }, [decoratedSlots, filters]);

  // Опции за филтрите по време — от работното време на деня.
  const timeOptions = useMemo(() => {
    const wh = getWorkingHours(config, dateKey);
    if (!wh) return [];
    const out = [];
    for (let m = wh.startMin; m <= wh.endMin; m += config.slotGranularityMin) out.push(m);
    return out;
  }, [config, dateKey]);

  const maxDateKey = useMemo(() => addDaysKey(today, config.maxAdvanceDays), [today, config.maxAdvanceDays]);

  const setDate = useCallback((nextKey) => dispatch({ type: 'SET_DATE', dateKey: nextKey }), [dispatch]);
  const changeBusiness = useCallback((id) => dispatch({ type: 'SET_BUSINESS', businessId: id }), [dispatch]);

  const openCreate = useCallback((slot) => {
    if (!resource) return;
    setDialog({ mode: 'create', resourceId: resource.id, start: slot.start });
  }, [resource]);

  const openReschedule = useCallback((booking) => setDialog({ mode: 'reschedule', booking }), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const cancelBooking = useCallback((booking) => {
    if (window.confirm('Отказване на резервацията на ' + booking.customer + '?')) {
      dispatch({ type: 'CANCEL_BOOKING', id: booking.id });
      showToast('Резервацията е отказана.');
    }
  }, [dispatch, showToast]);

  const handleSaveCreate = useCallback((payload) => {
    if (!dialog) return;
    const booking = {
      id: 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      businessId,
      resourceId: dialog.resourceId,
      ...payload,
    };
    dispatch({ type: 'ADD_BOOKING', booking });
    setDialog(null);
    showToast('Резервацията е създадена.');
  }, [businessId, dialog, dispatch, showToast]);

  const handleSaveReschedule = useCallback((id, patch) => {
    dispatch({ type: 'RESCHEDULE_BOOKING', id, patch });
    setDialog(null);
    showToast('Резервацията е преместена.');
  }, [dispatch, showToast]);

  const businessCount = useBusinessBookingCount();

  const freeSlotsCount = useMemo(() => {
    let n = 0;
    for (const s of decoratedSlots) if (s.status === 'free') n += 1;
    return n;
  }, [decoratedSlots]);

  return (
    <div className="app" style={{ '--accent': config.color }}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-badge" style={{ background: config.color }}>{config.shortLabel}</span>
          <div>
            <h1>Универсална система за резервации</h1>
            <p className="subtitle">{config.name} — {config.description}</p>
          </div>
        </div>
        <BusinessTabs activeId={businessId} onChange={changeBusiness} />
      </header>

      <Toolbar
        dateKey={dateKey}
        isToday={dateKey === today}
        canGoPrev={dateKey > today}
        canGoNext={dateKey < maxDateKey}
        onPrev={() => setDate(addDaysKey(dateKey, -1))}
        onNext={() => setDate(addDaysKey(dateKey, 1))}
        onToday={() => setDate(today)}
        filters={filters}
        onFiltersChange={setFilters}
        timeOptions={timeOptions}
      />

      <StatsBar
        businessCount={businessCount}
        dayCount={dayBookings.length}
        freeSlots={freeSlotsCount}
        totalSlots={decoratedSlots.length}
      />

      <main className="layout">
        <ResourcePanel
          infos={visibleResources}
          selectedId={resource ? resource.id : null}
          onSelect={setSelectedResourceId}
          hiddenCount={config.resources.length - visibleResources.length}
        />
        <section className="day-view">
          <SlotGrid
            slots={visibleSlots}
            resource={resource}
            dateKey={dateKey}
            onSelectSlot={openCreate}
          />
          <DayBookings
            bookings={dayBookings}
            resource={resource}
            config={config}
            nowMs={now}
            onReschedule={openReschedule}
            onCancel={cancelBooking}
          />
        </section>
      </main>

      {dialog && (
        <BookingDialog
          config={config}
          resource={resource}
          dateKey={dateKey}
          dayBookings={dayBookings}
          nowMs={now}
          mode={dialog.mode}
          booking={dialog.booking || null}
          initialStart={dialog.start || null}
          onClose={closeDialog}
          onSaveCreate={handleSaveCreate}
          onSaveReschedule={handleSaveReschedule}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <footer className="app-footer">
        Демо със симулирани данни — промените живеят само в паметта на браузъра.
        Проверките за наличност са O(log n): сортиран индекс + бинарно търсене (виж README).
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BookingStoreProvider>
      <Shell />
    </BookingStoreProvider>
  );
}
