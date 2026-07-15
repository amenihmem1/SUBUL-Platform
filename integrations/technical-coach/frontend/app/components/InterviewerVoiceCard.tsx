"use client";

import { useEffect, useRef } from "react";

type InterviewerUtterance = {
  id: number;
  text: string;
  audioBase64?: string;
  audioMimeType?: string;
};

type InterviewerVoiceCardProps = {
  utterance: InterviewerUtterance | null;
  voiceEnabled: boolean;
  onAudioUtterance?: (utterance: InterviewerUtterance) => void;
};

export function InterviewerVoiceCard({
  utterance,
  voiceEnabled,
  onAudioUtterance,
}: InterviewerVoiceCardProps) {
  const lastUtteranceIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!voiceEnabled || !utterance || !utterance.text.trim()) return;
    if (lastUtteranceIdRef.current === utterance.id) return;
    lastUtteranceIdRef.current = utterance.id;
    onAudioUtterance?.(utterance);
  }, [onAudioUtterance, utterance, voiceEnabled]);

  return (
    <div className="interviewer-voice-shell interviewer-runtime-shell" aria-live="polite">
      <div className="interviewer-avatar-idle">
        <div className="avatar-stage interviewer-avatar-stage">
          <span className="avatar-orbit interviewer-orbit-a" aria-hidden="true" />
          <span className="avatar-orbit interviewer-orbit-b" aria-hidden="true" />
          <span className="avatar recruiter-avatar">TC</span>
        </div>
      </div>
    </div>
  );
}
