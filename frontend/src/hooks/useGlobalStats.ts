import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGlobalStats, type GlobalStats } from '../services/historyApi';

const FALLBACK: GlobalStats = { commandsToday: 0, commandsYesterday: 0 };

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>(FALLBACK);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const load = useCallback(async () => {
    try {
      const data = await fetchGlobalStats();
      setStats(data);
    } catch {
      // Silently fallback — keeps last known value
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  return {
    commandsToday: stats.commandsToday,
    commandsYesterday: stats.commandsYesterday,
    growthToday: stats.commandsToday - stats.commandsYesterday,
  };
}
