"use client";

import { RefObject, useEffect, useState } from "react";

import {
  getFaceLandmarker,
  idleFaceAnalysis,
  nextFaceDetectionTimestamp,
  resetFaceLandmarker,
  summarizeFaceResult,
  type CandidateFaceAnalysis,
} from "../../lib/faceAnalysis";

const ANALYSIS_INTERVAL_MS = 420;
const MAX_RECOVERY_ATTEMPTS = 2;

export function useCandidateFaceAnalysis(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [analysis, setAnalysis] = useState<CandidateFaceAnalysis>(idleFaceAnalysis);

  useEffect(() => {
    if (!enabled) {
      setAnalysis(idleFaceAnalysis);
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let lastAnalyzedAt = 0;
    let recoveryAttempts = 0;

    setAnalysis((current) => ({ ...current, status: "loading", message: "Starting live face analysis..." }));

    const run = async () => {
      try {
        let landmarker = await getFaceLandmarker();
        if (cancelled) return;

        const tick = async () => {
          if (cancelled) return;

          const video = videoRef.current;
          const now = performance.now();

          if (
            video &&
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            now - lastAnalyzedAt >= ANALYSIS_INTERVAL_MS
          ) {
            lastAnalyzedAt = now;
            try {
              const result = landmarker.detectForVideo(video, nextFaceDetectionTimestamp());
              recoveryAttempts = 0;
              if (!cancelled) {
                setAnalysis(summarizeFaceResult(result));
              }
            } catch (error) {
              if (recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
                recoveryAttempts += 1;
                resetFaceLandmarker();
                try {
                  landmarker = await getFaceLandmarker();
                } catch {
                  // The next frame reports the original runtime error.
                }
              } else if (!cancelled) {
                setAnalysis({
                  ...idleFaceAnalysis,
                  status: "error",
                  message: "Live face analysis failed.",
                  error: (error as Error).message,
                });
              }
            }
          }

          if (!cancelled) {
            frameId = window.requestAnimationFrame(() => {
              void tick();
            });
          }
        };

        frameId = window.requestAnimationFrame(() => {
          void tick();
        });
      } catch (error) {
        if (!cancelled) {
          setAnalysis({
            ...idleFaceAnalysis,
            status: "error",
            message: "Face analysis is unavailable in this browser.",
            error: (error as Error).message,
          });
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [enabled, videoRef]);

  return analysis;
}
