import { useQuery } from '@tanstack/react-query';
import { fetchBotStatus, type BotStatus } from '../services/statusApi';

const BOT_STATUS_QUERY_KEY = ['bot-status'];

export function useBotStatus() {
  const { data, isLoading, error } = useQuery<BotStatus>({
    queryKey: BOT_STATUS_QUERY_KEY,
    queryFn: fetchBotStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  return {
    status: data?.status ?? 'online',
    latencyMs: data?.latency_ms ?? 0,
    errorRate: data?.error_rate ?? 0,
    updatedAt: data?.updated_at ?? '',
    isLoading,
    isError: !!error,
  };
}
