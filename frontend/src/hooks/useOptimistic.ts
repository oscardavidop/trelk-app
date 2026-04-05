import { useCallback, useRef, useState } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';

interface OptimisticOptions<TData, TVariables> {
  /** Query key to optimistically update */
  queryKey: QueryKey;
  /** How to produce the optimistic data given current data + mutation variables */
  updater: (current: TData | undefined, variables: TVariables) => TData;
  /** The actual mutation function */
  mutationFn: (variables: TVariables) => Promise<unknown>;
  /** Optional callback on success */
  onSuccess?: () => void;
  /** Optional callback on error (rollback is automatic) */
  onError?: (err: Error) => void;
}

/**
 * useOptimistic — instant optimistic updates with automatic rollback.
 *
 * Updates the TanStack Query cache immediately, then runs the mutation.
 * On failure, rolls back to the previous value.
 *
 * Usage:
 *   const { mutate, isPending } = useOptimistic({
 *     queryKey: ['reviews', command],
 *     updater: (data, { helpful }) => ({ ...data, helpfulCount: data.helpfulCount + 1 }),
 *     mutationFn: (vars) => api.markHelpful(vars.reviewId),
 *   });
 */
export function useOptimistic<TData = unknown, TVariables = unknown>({
  queryKey,
  updater,
  mutationFn,
  onSuccess,
  onError,
}: OptimisticOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const rollbackRef = useRef<TData | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (variables: TVariables) => {
      // Save current state for rollback
      rollbackRef.current = queryClient.getQueryData<TData>(queryKey);

      // Apply optimistic update immediately
      queryClient.setQueryData<TData>(queryKey, (old) => updater(old, variables));
      setIsPending(true);

      try {
        await mutationFn(variables);
        onSuccess?.();
      } catch (err) {
        // Rollback on failure
        queryClient.setQueryData(queryKey, rollbackRef.current);
        onError?.(err as Error);
      } finally {
        setIsPending(false);
        // Ensure data consistency after mutation
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, queryKey, updater, mutationFn, onSuccess, onError],
  );

  return { mutate, isPending };
}
