import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi } from '../api/endpoints';
import { ApprovalActionPayload } from '../types';
import { DOCUMENT_KEYS } from './useDocuments';

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => approvalApi.getPendingApprovals(),
    staleTime: 1000 * 10,
  });
}

export function useApprovalAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApprovalActionPayload) => approvalApi.performApprovalAction(payload),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.detail(updatedDoc.id) });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
