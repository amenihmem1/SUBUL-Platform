'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildSpeechText } from '@/services/heygen';

const SIMLI_API_KEY  = (process.env.NEXT_PUBLIC_SIMLI_API_KEY  as string | undefined) ?? '';
const SIMLI_FACE_ID  = (process.env.NEXT_PUBLIC_SIMLI_FACE_ID  as string | undefined) ?? '';
const AVATAR_PREVIEW = (process.env.NEXT_PUBLIC_HEYGEN_AVATAR_PREVIEW as string | undefined) ??
  'https://files2.heygen.ai/avatar/v3/1ad51ab9fee24ae88af067206e14a1d8_44250/preview_target.webp';
const LS_KEY = 'subul_avatar_teacher_enabled';

/** Down-sample Float32 PCM from any sample-rate to 16 kHz Int16 Uint8Array for Simli. */
function toSimliPCM(float32: Float32Array, sourceSampleRate: number): Uint8Array {
  const TARGET = 16_000;
  const ratio  = sourceSampleRate / TARGET;
  const len    = Math.floor(float32.length / ratio);
  const int16  = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = float32[Math.floor(i * ratio)];
    int16[i] = Math.max(-32_768, Math.min(32_767, Math.round(s * 32_767)));
  }
  return new Uint8Array(int16.buffer);
}

export interface AvatarTeacherHandle {
  /** Not used when Simli is active — Cartesia handles audio. */
  startSpeaking(title: string, content: string, bullets: string[], examTips: string[]): void;
  stopSpeaking(): void;
  pauseSpeaking(): void;
  resumeSpeaking(): void;
  isReady(): boolean;
  /** Feed a Cartesia audio chunk into Simli for real-time lip sync. */
  sendAudioChunk(float32: Float32Array, sourceSampleRate: number): void;
}

interface Props {
  agentState: 'idle' | 'loading' | 'speaking' | 'paused';
  language?: 'fr' | 'en' | 'ar';
  onSpeakingEnd?: () => void;
  onReady?: () => void;
  onFallback?: () => void;
}

type AvatarStatus = 'hidden' | 'initializing' | 'ready' | 'speaking' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimliClientInstance = any;

const AvatarTeacher = forwardRef<AvatarTeacherHandle, Props>(function AvatarTeacher(
  { agentState, onFallback },
  ref,
) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(LS_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [status, setStatus] = useState<AvatarStatus>('hidden');
  // true only after Simli WebRTC 'start' fires — drives live-video vs preview/CSS display
  const [simliConnected, setSimliConnected] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const audioRef  = useRef<HTMLAudioElement>(null);   // muted, Simli output sink
  const simliRef  = useRef<SimliClientInstance>(null);
  const resumeRef = useRef<string>('');

  // ── Simli WebRTC session lifecycle ─────────────────────────────────────────

  const destroySession = useCallback(async () => {
    try { await simliRef.current?.stop(); } catch { /* noop */ }
    simliRef.current = null;
    setSimliConnected(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const initSession = useCallback(async () => {
    // Cartesia always handles voice — Simli is face-animation only.
    onFallback?.();

    if (!SIMLI_API_KEY || !SIMLI_FACE_ID) {
      // No key or no face ID configured → CSS mouth animation fallback
      setStatus('ready');
      return;
    }

    setStatus('initializing');
    try {
      // Dynamic import keeps SSR clean — these use browser-only APIs.
      const { SimliClient, generateSimliSessionToken, generateIceServers } =
        await import('simli-client');

      const { session_token } = await generateSimliSessionToken({
        apiKey: SIMLI_API_KEY,
        config: {
          faceId:           SIMLI_FACE_ID,
          handleSilence:    true,
          maxSessionLength: 600,
          maxIdleTime:      120,
        },
      });

      const iceServers = await generateIceServers(SIMLI_API_KEY);

      if (!videoRef.current || !audioRef.current) throw new Error('elements not ready');

      const client: SimliClientInstance = new SimliClient(
        session_token,
        videoRef.current,
        audioRef.current,   // muted → Simli audio output goes nowhere
        iceServers,
      );

      client.on('start', () => {
        setSimliConnected(true);
        setStatus('ready');
      });
      client.on('speaking',      () => setStatus('speaking'));
      client.on('silent',        () => setStatus('ready'));
      client.on('error',         (d: string) => console.error('[Simli]', d));
      client.on('startup_error', (m: string) => {
        console.error('[Simli startup]', m);
        // Keep CSS animation running — don't blank the avatar
        simliRef.current = null;
        setStatus('ready');
      });
      client.on('stop', () => {
        setSimliConnected(false);
        setStatus('hidden');
      });

      simliRef.current = client;
      await client.start();
    } catch (err) {
      console.warn('[AvatarTeacher] Simli unavailable, falling back to CSS animation:', err);
      simliRef.current = null;
      setSimliConnected(false);
      // Fall back to CSS mouth animation so the avatar stays visible and responsive
      setStatus('ready');
    }
  }, [onFallback]);

  const toggle = useCallback(async () => {
    const next = !visible;
    setVisible(next);
    localStorage.setItem(LS_KEY, String(next));
    if (next) {
      await initSession();
    } else {
      await destroySession();
      setStatus('hidden');
    }
  }, [visible, initSession, destroySession]);

  useEffect(() => {
    if (visible) initSession();
    return () => { destroySession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Imperative handle ──────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    isReady: () => false,   // parent always uses Cartesia; Simli is passive

    startSpeaking(title, content, bullets, examTips) {
      resumeRef.current = buildSpeechText(title, content, bullets, examTips);
    },

    stopSpeaking()  { resumeRef.current = ''; },
    pauseSpeaking() { /* Cartesia handles pause */ },
    resumeSpeaking() { /* Cartesia handles resume */ },

    sendAudioChunk(float32: Float32Array, sourceSampleRate: number) {
      if (!simliRef.current) return;
      try {
        const pcm = toSimliPCM(float32, sourceSampleRate);
        simliRef.current.sendAudioData(pcm);
      } catch (err) {
        console.warn('[AvatarTeacher] sendAudioData failed, clearing Simli client:', err);
        simliRef.current = null;
      }
    },
  }), []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const isSpeaking = status === 'speaking' || agentState === 'speaking';
  // Show live WebRTC video only when Simli actually connected (not just API key present)
  const showLive   = (status === 'ready' || status === 'speaking') && simliConnected;
  // Show CSS animation when speaking but no live Simli video
  const showCssAnim = isSpeaking && !simliConnected;

  return (
    <div className="flex flex-col items-center gap-2 select-none">

      {/* Muted audio sink for Simli's WebRTC audio output */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} autoPlay muted className="hidden" />

      {/* Circle — click to toggle */}
      <button
        onClick={toggle}
        title={visible ? "Masquer l'enseignante IA" : "Afficher l'enseignante IA"}
        className="relative group focus:outline-none"
      >
        {/* Pulse rings when speaking */}
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400/30 pointer-events-none" />
        )}
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full animate-pulse bg-indigo-400/10 pointer-events-none" />
        )}

        {/* Main circle */}
        <div
          className={cn(
            'w-[136px] h-[136px] rounded-full overflow-hidden border-[3px] shadow-2xl transition-all duration-300 relative',
            isSpeaking ? 'border-indigo-400 shadow-indigo-300/50'
                       : visible ? 'border-white shadow-slate-400/40'
                                 : 'border-indigo-500 shadow-indigo-300/30',
          )}
        >
          {/* Static preview — shown until live Simli video takes over */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={AVATAR_PREVIEW}
            alt="Enseignante IA"
            className={cn(
              'absolute inset-0 w-full h-full object-cover scale-[1.85] origin-top translate-y-[6%] transition-opacity duration-500',
              showLive ? 'opacity-0' : 'opacity-100',
            )}
          />

          {/* Spinner overlay while Simli connects */}
          {visible && status === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
              <Loader2 className="h-7 w-7 text-white drop-shadow animate-spin" />
            </div>
          )}

          {/* ── Live Simli lip-sync video ── */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={cn(
              'absolute inset-0 w-full h-full object-cover scale-[1.85] origin-top translate-y-[6%] transition-opacity duration-500',
              showLive ? 'opacity-100' : 'opacity-0',
            )}
          />

          {/* CSS mouth animation — active when speaking without live Simli video */}
          {showCssAnim && (
            <div
              className="absolute pointer-events-none z-20"
              style={{ bottom: '26%', left: '50%', transform: 'translateX(-50%)' }}
            >
              <div className="rounded-full" style={{ width: 30, height: 4, background: 'rgba(180,100,90,0.45)', marginBottom: 1 }} />
              <div className="rounded-full animate-mouth" style={{ width: 30, height: 12, background: 'rgba(80,30,25,0.55)' }} />
              <div className="rounded-full" style={{ width: 30, height: 4, background: 'rgba(180,100,90,0.35)', marginTop: 1 }} />
            </div>
          )}
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold text-center leading-tight px-1">
            {visible ? 'Masquer' : 'Activer'}
          </span>
        </div>
      </button>

      {/* Label badge */}
      <div
        className={cn(
          'px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm whitespace-nowrap transition-all',
          isSpeaking          ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
            : status === 'initializing' ? 'bg-violet-50 border-violet-200 text-violet-600'
            : visible               ? 'bg-white border-slate-200 text-slate-500'
                                    : 'bg-indigo-600 border-indigo-600 text-white',
        )}
      >
        {isSpeaking              ? '🎤 En train de parler'
          : status === 'initializing' ? '⏳ Connexion...'
                                      : 'Enseignante IA'}
      </div>
    </div>
  );
});

export default AvatarTeacher;
