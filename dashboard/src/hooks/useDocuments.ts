import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/endpoints';
import { DocumentFilterParams } from '../types';

export const DOCUMENT_KEYS = {
  all: ['documents'] as const,
  lists: () => [...DOCUMENT_KEYS.all, 'list'] as const,
  list: (params?: DocumentFilterParams) => [...DOCUMENT_KEYS.lists(), params] as const,
  details: () => [...DOCUMENT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DOCUMENT_KEYS.details(), id] as const,
};

export function useDocuments(params?: DocumentFilterParams) {
  return useQuery({
    queryKey: DOCUMENT_KEYS.list(params),
    queryFn: () => documentsApi.getDocuments(params),
    staleTime: 1000 * 15,
  });
}

export function useDocument(id?: string) {
  return useQuery({
    queryKey: DOCUMENT_KEYS.detail(id || ''),
    queryFn: () => documentsApi.getDocumentById(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 10,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => documentsApi.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.reprocessDocument(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.lists() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
