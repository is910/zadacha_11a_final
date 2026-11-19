import { useEffect, useState } from 'react';

// "Сега" като state, опресняван на МИНУТА (не на секунда).
// Така правилата за минало време/lead time остават коректни, без
// излишни преизчисления и рендери — компонентите зависят от `now`
// само когато стойността наистина се промени.
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
