import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/endpoints';

export function useAuditLogs(params?: { page?: number; limit?: number; search?: string; action?: string }) {
  return useQuery({
    queryKey: ['audit', 'logs', params],
    queryFn: () => auditApi.getAuditLogs(params),
    staleTime: 1000 * 15,
  });
}

export function useVerifyHashChain() {
  return useQuery({
    queryKey: ['audit', 'verify-chain'],
    queryFn: () => auditApi.verifyHashChain(),
    staleTime: 1000 * 30,
  });
}
