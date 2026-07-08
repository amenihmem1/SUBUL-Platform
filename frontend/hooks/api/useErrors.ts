import { useMutation } from '@tanstack/react-query';
import { reportError, type ReportErrorPayload } from '@/services/errors';

export function useReportError() {
  return useMutation({
    mutationFn: (payload: ReportErrorPayload) => reportError(payload),
  });
}
