import { useState, useEffect, useRef, useCallback } from 'react';
import { globalStats } from '../mocks/globalStats';

interface GlobalStats {
  commandsToday: number;
  commandsYesterday: number;
}

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>(globalStats);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchStats = useCallback(() => {
    // Future: replace with fetch('/api/stats/global').then(r => r.json())
    // Simulate slight growth each refresh
    setStats((prev) => ({
      ...prev,
      commandsToday: prev.commandsToday + Math.floor(Math.random() * 12) + 1,
    }));
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(fetchStats, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchStats]);

  return {
    commandsToday: stats.commandsToday,
    commandsYesterday: stats.commandsYesterday,
    growthToday: stats.commandsToday - stats.commandsYesterday,
  };
}
