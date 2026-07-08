"use client";

import { useEffect, useRef, useState } from "react";
import type { ObjectDetection as CocoSsdModel } from "@tensorflow-models/coco-ssd";
import { ToastContainer } from "./Toast";
import { useCandidateFaceAnalysis } from "../hooks/useCandidateFaceAnalysis";
import { useInterviewWarnings } from "../hooks/useInterviewWarnings";
import {
  idleLiveEmotionAnalysis,
  useCandidateVisionReportCapture,
  type LiveEmotionAnalysis,
  type LiveEmotionLabel,
} from "../hooks/useCandidateVisionReportCapture";
import { useCandidateBackgroundBlur } from "../hooks/useCandidateBackgroundBlur";
import { idleFaceAnalysis, type CandidateFaceAnalysis } from "../../lib/faceAnalysis";
import type { InputMode } from "../../lib/sessionRuntime";

type CandidateTileProps = {
  cameraEnabled: boolean;
  cameraStream: MediaStream | null;
  candidateName: string;
  cvUploaded: boolean;
  inputMode: InputMode;
  interviewActive: boolean;
  interviewEnded: boolean;
  micListening: boolean;
  onEndCall: () => Promise<void>;
  onToggleCamera: () => Promise<void>;
  onToggleMic: () => Promise<void>;
  sessionId: string;
  sending: boolean;
};

type ObjectDetectionBox = {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const LIVE_EMOTION_ORDER: LiveEmotionLabel[] = ["happy", "neutral", "sad", "angry", "surprise"];

function formatLiveEmotionLabel(value: LiveEmotionLabel | "") {
  if (!value) {
    return "Waiting";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEmotionTimestamp(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function emotionTone(emotion: LiveEmotionLabel | "") {
  switch (emotion) {
    case "happy":
      return "happy";
    case "neutral":
      return "neutral";
    case "sad":
      return "sad";
    case "angry":
      return "angry";
    case "surprise":
      return "surprise";
    default:
      return "idle";
  }
}

function EmotionIcon({ emotion }: { emotion: LiveEmotionLabel | "" }) {
  const face = (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.7 10.1h.01" />
      <path d="M15.3 10.1h.01" />
    </>
  );

  switch (emotion) {
    case "happy":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {face}
          <path d="M8.6 14.2c1.6 2 5.2 2 6.8 0" />
        </svg>
      );
    case "neutral":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {face}
          <path d="M8.8 15h6.4" />
        </svg>
      );
    case "sad":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {face}
          <path d="M8.7 16c1.7-1.6 4.9-1.6 6.6 0" />
        </svg>
      );
    case "angry":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.4" />
          <path d="M8 8.6l2.2 1" />
          <path d="M16 8.6l-2.2 1" />
          <path d="M8.9 15.7c1.8-1.2 4.4-1.2 6.2 0" />
        </svg>
      );
    case "surprise":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {face}
          <path d="M12 14.1a1.6 1.9 0 1 0 0 3.8a1.6 1.9 0 0 0 0-3.8Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {face}
          <path d="M9.2 15c1.4.8 4.2.8 5.6 0" />
        </svg>
      );
  }
}

export function CandidateTile({
  cameraEnabled,
  cameraStream,
  candidateName,
  cvUploaded,
  inputMode,
  interviewActive,
  interviewEnded,
  micListening,
  onEndCall,
  onToggleCamera,
  onToggleMic,
  sessionId,
  sending,
}: CandidateTileProps) {
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frozenAnalysis, setFrozenAnalysis] = useState<CandidateFaceAnalysis>(idleFaceAnalysis);
  const [frozenLiveEmotion, setFrozenLiveEmotion] = useState<LiveEmotionAnalysis>(idleLiveEmotionAnalysis);
  const [cameraSceneMode, setCameraSceneMode] = useState<"normal" | "blur" | "background">("normal");
  const [backgroundPreset, setBackgroundPreset] = useState<"office" | "meeting" | "minimal">("office");
  const [objectDetections, setObjectDetections] = useState<ObjectDetectionBox[]>([]);
  const objectDetectionModelRef = useRef<CocoSsdModel | null>(null);
  const { toasts, removeToast } = useInterviewWarnings({
    active: interviewActive && !interviewEnded,
    sessionId,
  });
  const liveVisionEnabled = cameraEnabled && Boolean(cameraStream) && !interviewEnded;
  const analysis = useCandidateFaceAnalysis(sourceVideoRef, liveVisionEnabled);
  const liveEmotion = useCandidateVisionReportCapture(sourceVideoRef, liveVisionEnabled, sessionId, analysis, objectDetections);
  useCandidateBackgroundBlur(
    sourceVideoRef,
    blurCanvasRef,
    cameraEnabled && cameraSceneMode !== "normal" ? cameraSceneMode : null,
    backgroundPreset
  );
  const displayName = candidateName || "Candidate";
  const idleNote = micListening
    ? "Microphone active. You can keep speaking or enable the camera for live visual signals."
    : inputMode === "text"
      ? "Mode texte actif. Passez en mixte ou micro pour repondre oralement."
      : "";
  const displayedAnalysis = interviewEnded ? frozenAnalysis : analysis;
  const displayedLiveEmotion = interviewEnded ? frozenLiveEmotion : liveEmotion;
  const liveEmotionTime = formatEmotionTimestamp(displayedLiveEmotion.updatedAt);
  const dominantEmotionTone = emotionTone(displayedLiveEmotion.dominantEmotion);
  const displayedEmotionIcon = displayedLiveEmotion.status === "ready" ? displayedLiveEmotion.dominantEmotion : "";
  const showAnalysisMeta = displayedLiveEmotion.status !== "ready";

  const renderAnalysisIcon = (kind: "face" | "focus" | "frame" | "expression" | "posture" | "faces") => {
    switch (kind) {
      case "face":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3c4.4 0 7 3.4 7 8.4c0 5.1-2.9 9.6-7 9.6s-7-4.5-7-9.6C5 6.4 7.6 3 12 3Z" />
            <path d="M9.3 11.1h.01" />
            <path d="M14.7 11.1h.01" />
            <path d="M9.5 15c1.4 1.2 3.6 1.2 5 0" />
          </svg>
        );
      case "focus":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.8 12s3.4-5 9.2-5s9.2 5 9.2 5s-3.4 5-9.2 5s-9.2-5-9.2-5Z" />
            <path d="M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5Z" />
          </svg>
        );
      case "frame":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4H5a1 1 0 0 0-1 1v3" />
            <path d="M16 4h3a1 1 0 0 1 1 1v3" />
            <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
            <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
            <path d="M9 12h6" />
          </svg>
        );
      case "expression":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5c4.7 0 7.5 3.5 7.5 8.5s-3 8.5-7.5 8.5S4.5 17 4.5 12s2.8-8.5 7.5-8.5Z" />
            <path d="M9.2 10.6h.01" />
            <path d="M14.8 10.6h.01" />
            <path d="M9.5 15.2c1.8-.8 3.2-.8 5 0" />
          </svg>
        );
      case "posture":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 0 0 0-3.6Z" />
            <path d="M9 20v-4.5l-1.5-2.7a1.1 1.1 0 0 1 1.9-1.1l1.2 2h3l1.2-2a1.1 1.1 0 0 1 1.9 1.1L15 15.5V20" />
          </svg>
        );
      case "faces":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 7.2c2.4 0 4 1.8 4 4.5s-1.7 4.8-4 4.8s-4-2.1-4-4.8s1.6-4.5 4-4.5Z" />
            <path d="M15.7 9.2c1.9.2 3.3 1.8 3.3 4c0 2.3-1.5 4.2-3.7 4.6" />
          </svg>
        );
    }
  };

  useEffect(() => {
    const attachStream = (node: HTMLVideoElement | null) => {
      if (!node) return;
      node.srcObject = cameraStream;
      if (cameraStream) {
        void node.play().catch(() => undefined);
      }
    };

    attachStream(sourceVideoRef.current);
    attachStream(previewVideoRef.current);

    return () => {
      if (sourceVideoRef.current) sourceVideoRef.current.srcObject = null;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    };
  }, [cameraSceneMode, cameraStream]);

  useEffect(() => {
    if (cameraEnabled && liveVisionEnabled && analysis.status !== "idle") {
      setFrozenAnalysis(analysis);
    }
  }, [analysis, cameraEnabled, liveVisionEnabled]);

  useEffect(() => {
    if (cameraEnabled && liveVisionEnabled && liveEmotion.status === "ready") {
      setFrozenLiveEmotion(liveEmotion);
    }
  }, [cameraEnabled, liveEmotion, liveVisionEnabled]);

  useEffect(() => {
    if (cameraEnabled) return;
    setFrozenAnalysis(idleFaceAnalysis);
  }, [cameraEnabled]);

  useEffect(() => {
    if (cameraEnabled) return;
    setFrozenLiveEmotion(idleLiveEmotionAnalysis);
  }, [cameraEnabled]);

  useEffect(() => {
    if (cameraEnabled) return;
    setCameraSceneMode("normal");
  }, [cameraEnabled]);

  useEffect(() => {
    if (!cameraEnabled || !cameraStream) {
      setObjectDetections([]);
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const scheduleNextDetection = (delay = 450) => {
      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        void detectObjects();
      }, delay);
    };

    const mapPredictionToDetection = (
      prediction: { bbox: [number, number, number, number]; class: string; score: number },
      index: number
    ): ObjectDetectionBox | null => {
      const sourceVideo = sourceVideoRef.current;
      const previewVideo = previewVideoRef.current;
      const canvasPreview = blurCanvasRef.current;
      const target = cameraSceneMode === "normal" ? previewVideo : canvasPreview;
      if (!sourceVideo || sourceVideo.readyState < 2 || !sourceVideo.videoWidth || !sourceVideo.videoHeight || !target) {
        return null;
      }

      const containerWidth = target.clientWidth || sourceVideo.videoWidth;
      const containerHeight = target.clientHeight || sourceVideo.videoHeight;
      const scale = Math.max(containerWidth / sourceVideo.videoWidth, containerHeight / sourceVideo.videoHeight);
      const renderedWidth = sourceVideo.videoWidth * scale;
      const renderedHeight = sourceVideo.videoHeight * scale;
      const offsetX = (containerWidth - renderedWidth) / 2;
      const offsetY = (containerHeight - renderedHeight) / 2;
      const [sourceX, sourceY, sourceWidth, sourceHeight] = prediction.bbox;
      const displayedX = offsetX + sourceX * scale;
      const displayedY = offsetY + sourceY * scale;
      const displayedWidth = sourceWidth * scale;
      const displayedHeight = sourceHeight * scale;
      const mirroredX = containerWidth - displayedX - displayedWidth;
      const clippedX = Math.max(0, Math.min(containerWidth, mirroredX));
      const clippedY = Math.max(0, Math.min(containerHeight, displayedY));
      const clippedRight = Math.max(0, Math.min(containerWidth, mirroredX + displayedWidth));
      const clippedBottom = Math.max(0, Math.min(containerHeight, displayedY + displayedHeight));
      const width = clippedRight - clippedX;
      const height = clippedBottom - clippedY;

      if (width <= 2 || height <= 2) {
        return null;
      }

      return {
        id: `${prediction.class}-${index}`,
        label: prediction.class,
        confidence: prediction.score,
        x: (clippedX / containerWidth) * 100,
        y: (clippedY / containerHeight) * 100,
        width: (width / containerWidth) * 100,
        height: (height / containerHeight) * 100,
      };
    };

    const loadModel = async () => {
      if (objectDetectionModelRef.current) {
        return objectDetectionModelRef.current;
      }

      const [, cocoSsd] = await Promise.all([import("@tensorflow/tfjs"), import("@tensorflow-models/coco-ssd")]);
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      objectDetectionModelRef.current = model;
      return model;
    };

    const detectObjects = async () => {
      const video = sourceVideoRef.current;
      if (cancelled || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        scheduleNextDetection(180);
        return;
      }

      try {
        const model = await loadModel();
        if (cancelled) return;
        const predictions = await model.detect(video, 10, 0.25);
        if (cancelled) return;
        setObjectDetections(
          predictions
            .map(mapPredictionToDetection)
            .filter((detection): detection is ObjectDetectionBox => Boolean(detection))
        );
      } catch {
        if (!cancelled) {
          setObjectDetections([]);
        }
        return;
      }

      scheduleNextDetection();
    };

    void detectObjects();
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [cameraEnabled, cameraSceneMode, cameraStream]);

  const renderObjectDetectionLayer = () => (
    <div className="candidate-detection-layer" aria-hidden="true">
      {objectDetections
        .filter((detection) => detection.label !== "remote")
        .map((detection) => (
          <span
            key={detection.id}
            className="candidate-detection-box"
            style={{
              left: `${detection.x}%`,
              top: `${detection.y}%`,
              width: `${detection.width}%`,
              height: `${detection.height}%`,
            }}
          >
            <span className="candidate-detection-label">{detection.label}</span>
          </span>
        ))}
    </div>
  );

  const primaryPills = cameraEnabled
    ? [
        {
          label: displayedAnalysis.faceDetected ? "Face detected" : "No face",
          tone: displayedAnalysis.faceDetected ? "good" : "bad",
          icon: "face" as const,
        },
        {
          label: displayedAnalysis.multipleFaces
            ? "Multiple faces"
            : displayedAnalysis.lookingForward
              ? "Looking forward"
              : "Looking away",
          tone: displayedAnalysis.multipleFaces ? "warn" : displayedAnalysis.lookingForward ? "good" : "warn",
          icon: "focus" as const,
        },
        {
          label: displayedAnalysis.centered ? "Centered" : "Off-center",
          tone: displayedAnalysis.centered ? "good" : "warn",
          icon: "frame" as const,
        },
      ]
    : [];

  const analysisMeta = [
    { label: "Posture", value: displayedAnalysis.posture, icon: "posture" as const },
    { label: "Faces", value: String(displayedAnalysis.faceCount), icon: "faces" as const },
  ];

  return (
    <article className={`tile candidate-tile ${micListening ? "speaking" : ""} ${cameraEnabled ? "camera-on" : ""}`}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="tile-ambient tile-ambient-candidate" aria-hidden="true" />
      <span className="tile-badge">{displayName}</span>
      {!cameraEnabled ? (
        <div className="candidate-idle-shell">
          {idleNote ? (
            <div className="candidate-idle-copy">
              <p className="candidate-idle-note">{idleNote}</p>
            </div>
          ) : null}
          <div className="avatar-stage">
            <span className="avatar-orbit avatar-orbit-a" aria-hidden="true" />
            <span className="avatar-orbit avatar-orbit-b" aria-hidden="true" />
            <span className="avatar candidate-avatar">{(displayName.slice(0, 1) || "S").toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <div className="avatar-stage">
          <div className={`candidate-camera-shell is-${cameraSceneMode}`}>
            <video ref={sourceVideoRef} className="candidate-camera-source" autoPlay playsInline muted aria-hidden="true" />
            <div className="candidate-camera-modebar" aria-label="Camera background mode">
              <button
                type="button"
                className={`candidate-camera-mode ${cameraSceneMode === "normal" ? "is-active" : ""}`}
                onClick={() => setCameraSceneMode("normal")}
                aria-pressed={cameraSceneMode === "normal"}
              >
                Normal
              </button>
              <button
                type="button"
                className={`candidate-camera-mode ${cameraSceneMode === "blur" ? "is-active" : ""}`}
                onClick={() => setCameraSceneMode("blur")}
                aria-pressed={cameraSceneMode === "blur"}
              >
                Flou
              </button>
              <button
                type="button"
                className={`candidate-camera-mode ${cameraSceneMode === "background" ? "is-active" : ""}`}
                onClick={() => setCameraSceneMode("background")}
                aria-pressed={cameraSceneMode === "background"}
              >
                Fond
              </button>
            </div>
            {cameraSceneMode === "background" ? (
              <div className="candidate-camera-background-bar" aria-label="Background presets">
                <button
                  type="button"
                  className={`candidate-camera-background-chip ${backgroundPreset === "office" ? "is-active" : ""}`}
                  onClick={() => setBackgroundPreset("office")}
                  aria-pressed={backgroundPreset === "office"}
                >
                  Violet
                </button>
                <button
                  type="button"
                  className={`candidate-camera-background-chip ${backgroundPreset === "meeting" ? "is-active" : ""}`}
                  onClick={() => setBackgroundPreset("meeting")}
                  aria-pressed={backgroundPreset === "meeting"}
                >
                  Bleu
                </button>
                <button
                  type="button"
                  className={`candidate-camera-background-chip ${backgroundPreset === "minimal" ? "is-active" : ""}`}
                  onClick={() => setBackgroundPreset("minimal")}
                  aria-pressed={backgroundPreset === "minimal"}
                >
                  Beige
                </button>
              </div>
            ) : null}
            {cameraSceneMode === "normal" ? (
              <>
                <video ref={previewVideoRef} className="candidate-camera-preview" autoPlay playsInline muted />
                {renderObjectDetectionLayer()}
              </>
            ) : (
              <div className="candidate-camera-stage">
                <canvas ref={blurCanvasRef} className="candidate-camera-preview candidate-camera-preview-canvas" />
                <span className="candidate-camera-blur-frame" aria-hidden="true" />
                {renderObjectDetectionLayer()}
              </div>
            )}
          </div>
        </div>
      )}
      {cameraEnabled ? (
        <div className="candidate-analysis" aria-live={liveVisionEnabled ? "polite" : undefined}>
          <div className="candidate-analysis-header">
            <div className="candidate-analysis-copy">
              <span className="candidate-analysis-caption">
                <span className="candidate-analysis-caption-icon" aria-hidden="true">
                  {renderAnalysisIcon("focus")}
                </span>
                {interviewEnded ? "Face analysis stopped at the end of the interview." : displayedAnalysis.message}
              </span>
            </div>
          </div>

          <div className="candidate-analysis-pills">
            {primaryPills.map((pill) => (
              <span key={pill.label} className={`candidate-analysis-pill is-${pill.tone}`}>
                <span className="candidate-analysis-pill-icon" aria-hidden="true">
                  {renderAnalysisIcon(pill.icon)}
                </span>
                {pill.label}
              </span>
            ))}
          </div>

          <div className={`candidate-emotion-live is-${dominantEmotionTone}`}>
            <div className="candidate-emotion-live-header">
              <div className="candidate-emotion-live-copy">
                <div className="candidate-emotion-live-title-row">
                  <span className={`candidate-emotion-live-icon is-${dominantEmotionTone}`} aria-hidden="true">
                    <EmotionIcon emotion={displayedEmotionIcon} />
                  </span>
                  <span className="candidate-emotion-live-title-copy">
                    <span className="candidate-emotion-live-kicker">emotion</span>
                    <strong className="candidate-emotion-live-title">
                      {displayedLiveEmotion.status === "ready"
                        ? formatLiveEmotionLabel(displayedLiveEmotion.dominantEmotion)
                        : "Waiting ..."}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="candidate-emotion-live-metrics">
                <span className="candidate-emotion-live-confidence">
                  {displayedLiveEmotion.confidence != null ? `${displayedLiveEmotion.confidence}% conf.` : "--"}
                </span>
                {liveEmotionTime ? <span className="candidate-emotion-live-time">{liveEmotionTime}</span> : null}
              </div>
            </div>

            <div className="candidate-emotion-live-status">
              <span className="candidate-emotion-live-summary">{displayedLiveEmotion.summary}</span>
              <span className="candidate-emotion-live-stress">
                Stress signal {displayedLiveEmotion.stressSignal != null ? `${displayedLiveEmotion.stressSignal}%` : "--"}
              </span>
            </div>

            <div className="candidate-emotion-live-bars" aria-label="Live emotion probabilities">
              {LIVE_EMOTION_ORDER.map((label) => {
                const value = displayedLiveEmotion.probabilities[label];
                const isDominant = displayedLiveEmotion.status === "ready" && displayedLiveEmotion.dominantEmotion === label;

                return (
                  <div key={label} className={`candidate-emotion-live-bar ${isDominant ? "is-dominant" : ""}`}>
                    <span className="candidate-emotion-live-bar-label">
                      <span className={`candidate-emotion-live-bar-icon is-${label}`} aria-hidden="true">
                        <EmotionIcon emotion={label} />
                      </span>
                      <span>{formatLiveEmotionLabel(label)}</span>
                    </span>
                    <span className="candidate-emotion-live-bar-track" aria-hidden="true">
                      <span
                        className={`candidate-emotion-live-bar-fill is-${label}`}
                        style={{ width: `${value}%` }}
                      />
                    </span>
                    <strong className="candidate-emotion-live-bar-value">{value}%</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {showAnalysisMeta ? (
            <div className="candidate-analysis-meta">
              {analysisMeta.map((item) => (
                <span key={item.label} className="candidate-analysis-stat">
                  <span className="candidate-analysis-stat-icon" aria-hidden="true">
                    {renderAnalysisIcon(item.icon)}
                  </span>
                  <span className="candidate-analysis-stat-label">{item.label}</span>
                  <span className="candidate-analysis-stat-value">{item.value}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="candidate-controls" aria-label="Candidate controls">
        <button
          type="button"
          className={`candidate-control camera-toggle ${cameraEnabled ? "active" : ""}`}
          aria-label={cameraEnabled ? "Stop camera" : "Start camera"}
          aria-pressed={cameraEnabled}
          disabled={sending || interviewEnded}
          onClick={onToggleCamera}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 8h10v8H4z" />
            <path d="M14 11l5-3v8l-5-3" />
          </svg>
        </button>
        <button
          type="button"
          className={`candidate-control mic-toggle ${micListening ? "active" : ""}`}
          aria-label={micListening ? "Stop microphone" : "Start microphone"}
          aria-pressed={micListening}
          disabled={sending || interviewEnded || (!cvUploaded && !micListening)}
          onClick={onToggleMic}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3Z" />
            <path d="M6.5 10.5a5.5 5.5 0 1 0 11 0" />
            <path d="M12 16v4" />
          </svg>
        </button>
        <button
          type="button"
          className="candidate-control end-call"
          aria-label={interviewEnded ? "Interview already ended" : "End interview"}
          disabled={interviewEnded}
          onClick={() => {
            void onEndCall();
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M5 15c3-3 11-3 14 0" />
            <path d="M8 13l-2 3" />
            <path d="M16 13l2 3" />
          </svg>
        </button>
      </div>
    </article>
  );
}
