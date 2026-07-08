import { useMutation } from '@tanstack/react-query';
import { cloudTutorChatStream, type CloudTutorChatCallbacks } from '@/services/cloud-tutor';

export function useCloudTutorChatMutation() {
  return useMutation({
    mutationFn: ({
      body,
      callbacks,
    }: {
      body: Record<string, unknown>;
      callbacks?: CloudTutorChatCallbacks;
    }) => cloudTutorChatStream(body, callbacks),
  });
}
