import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 30, // Polling every 30 seconds for live updates
  });
}
