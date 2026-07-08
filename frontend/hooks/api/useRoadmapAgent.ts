import { useMutation } from '@tanstack/react-query';
import {
  roadmapAgentGenerateStream,
  type RoadmapAgentGenerateCallbacks,
} from '@/services/roadmap-agent';

export function useRoadmapAgentGenerateMutation() {
  return useMutation({
    mutationFn: ({
      body,
      callbacks,
    }: {
      body: Record<string, unknown>;
      callbacks?: RoadmapAgentGenerateCallbacks;
    }) => roadmapAgentGenerateStream(body, callbacks),
  });
}
