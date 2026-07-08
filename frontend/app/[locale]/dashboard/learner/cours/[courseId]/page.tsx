'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Target,
  PanelLeft,
  PanelLeftClose,
  Send,
  ChevronDown,
  MessageSquare,
  X,
  Bot,
  Loader2,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Award,
  Sparkles,
  Bookmark,
  Clock,
  Star,
  FileText,
  ExternalLink,
  MoreHorizontal,
  Zap,
  Brain,
  ThumbsUp,
  ThumbsDown,
  PenLine,
  ALargeSmall,
  CheckCheck,
  FlaskConical,
  LayoutList,
  StickyNote,
  Hash,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import CourseSidebar from '@/components/learner/CourseSidebar';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import ModuleQuizModal from '@/components/learner/ModuleQuizModal';
import { getBackendUrl, API_PATHS } from '@/lib/api/client';
import { getToken } from '@/lib/auth/token';
import { useCourse, useCourseProgress, useCompleteLesson } from '@/hooks/api/useCourses';
import { downloadCourseCompletionCertificate } from '@/services/courses';
import { cloudTutorSessionEnd } from '@/services/cloud-tutor';
import {
  VOICE_MAX,
  CARTESIA_VOICES,
  readMonthlyVoice,
  writeMonthlyVoice,
  buildCartesiaTtsWebSocketUrl,
} from '@/lib/voice-assistant';
import type { CourseContentResponse, CourseModule, CourseLevel } from '@/services/courses';
import type { LessonRef } from '@/components/learner/CourseSidebar';
import { quizResultsService, type AssessmentResult } from '@/services/quiz-results';
import UniversalTutor from '@/components/learner/UniversalTutor';
import AvatarTeacher, { type AvatarTeacherHandle } from '@/components/learner/AvatarTeacher';

const DEEPGRAM_API_KEY = 'a35f27d320751cd79947fa0541196998df5cb993';
const CARTESIA_API_KEY = 'sk_car_aQJuuV1BBJFZ26Xhbur6Cz';

function getQuizDomain(
  scores: AssessmentResult['scores'],
  primaryProfile: string,
): 'devops' | 'ai' | 'cyber' {
  const profile = primaryProfile.toLowerCase();
  if (profile.includes('cyber') || profile.includes('security')) return 'cyber';
  if (profile.includes('ai') || profile.includes('machine learning') || profile.includes('data')) return 'ai';
  if (profile.includes('cloud') || profile.includes('devops') || profile.includes('dev ops')) return 'devops';
  const { cloudPercentage, aiPercentage, cyberPercentage } = scores;
  if (cyberPercentage >= aiPercentage && cyberPercentage >= cloudPercentage) return 'cyber';
  if (aiPercentage >= cloudPercentage) return 'ai';
  return 'devops';
}

function mapQuizLevelToCourseLevel(level: string): 'beginner' | 'intermediate' {
  return level === 'Débutant' ? 'beginner' : 'intermediate';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildLessonRefs(modules: CourseModule[]): LessonRef[] {
  const refs: LessonRef[] = [];
  let idx = 0;
  modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => {
      refs.push({
        moduleId: mod.id,
        lessonId: lesson.id,
        moduleTitle: mod.title,
        moduleIcon: mod.icon ?? '',
        lesson: {
          id: lesson.id,
          title: lesson.title,
          content: lesson.content,
          bullets: lesson.bullets ?? [],
          examTips: lesson.examTips ?? [],
        },
        globalIndex: idx++,
      });
    });
  });
  return refs;
}

interface AIChatHandle {
  /** Call synchronously from the narration button click so Web Audio can resume (browser policy). */
  primeAudio: () => void;
  startNarration: (lessonTitle: string, lessonContent: string, bullets: string[], examTips: string[]) => void;
  /** Suspend the AudioContext clock — already-buffered chunks freeze in place until resume. */
  pauseNarration: () => void;
  /** Resume the AudioContext clock from the exact paused position. */
  resumeNarration: () => void;
  stopNarration: () => void;
}

// ─── AIChatPanel ──────────────────────────────────────────────────────────────

const AIChatPanel = forwardRef<AIChatHandle, {
  title: string;
  courseCode?: string;
  courseTitle?: string;
  lessonId?: number | string;
  onClose?: () => void;
  onNarrationEnd?: () => void;
  onNarrationStart?: () => void;
  onAudioChunk?: (float32: Float32Array, sampleRate: number) => void;
  voiceUsed: number;
  voiceMax: number;
  onVoiceConsume: () => void;
}>(function AIChatPanel({
  title,
  courseCode = 'cours',
  courseTitle,
  lessonId,
  onClose,
  onNarrationEnd,
  onNarrationStart,
  onAudioChunk,
  voiceUsed,
  voiceMax,
  onVoiceConsume,
}, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Bonjour ! Je suis **Subul IA**, votre tuteur pour **${title}**.\n\nPosez-moi vos questions par écrit ou utilisez le 🎤 micro pour parler ! 🎓`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substr(2, 9));

  // Client-side voice cap removed — backend AgentQuotaService is the only gate now.
  const voiceLimitReached = false;
  void voiceMax;

  const scrollRef          = useRef<HTMLDivElement>(null);
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const sttSocketRef       = useRef<WebSocket | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef    = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsWsRef           = useRef<WebSocket | null>(null);
  const narrationPlaybackTimerRef = useRef<number | null>(null);
  const narrationFinalizeSafetyRef = useRef<number | null>(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Bonjour ! Je suis **Subul IA**, votre tuteur pour **${title}**.\n\nPosez-moi vos questions par écrit ou utilisez le 🎤 micro pour parler ! 🎓`,
    }]);
  }, [title]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, liveTranscript]);

  useEffect(() => {
    playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    const sid = sessionId;
    return () => {
      abortControllerRef.current?.abort();
      playbackContextRef.current?.close();
      sttSocketRef.current?.close();
      cloudTutorSessionEnd(sid);
    };
  }, [sessionId]);

  const playAudioChunk = (arrayBuffer: ArrayBuffer) => {
    const ctx = playbackContextRef.current;
    if (!ctx) return;
    const schedule = () => {
      const float32Array = new Float32Array(arrayBuffer);
      if (float32Array.length === 0) return;
      const audioBuffer = ctx.createBuffer(1, float32Array.length, 44100);
      audioBuffer.getChannelData(0).set(float32Array);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      const now = ctx.currentTime;
      if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now;
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
      // Forward audio to Simli for real-time lip sync.
      onAudioChunk?.(float32Array, 44100);
    };
    if (ctx.state !== 'running') {
      void ctx.resume().then(schedule).catch(() => schedule());
    } else {
      schedule();
    }
  };

  const interruptAssistant = () => {
    if (narrationPlaybackTimerRef.current) {
      clearTimeout(narrationPlaybackTimerRef.current);
      narrationPlaybackTimerRef.current = null;
    }
    if (narrationFinalizeSafetyRef.current) {
      clearTimeout(narrationFinalizeSafetyRef.current);
      narrationFinalizeSafetyRef.current = null;
    }
    const ws = ttsWsRef.current;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
      } catch { /* noop */ }
      ttsWsRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  };

  const stopAllAudio = useCallback(() => {
    if (narrationPlaybackTimerRef.current) {
      clearTimeout(narrationPlaybackTimerRef.current);
      narrationPlaybackTimerRef.current = null;
    }
    if (narrationFinalizeSafetyRef.current) {
      clearTimeout(narrationFinalizeSafetyRef.current);
      narrationFinalizeSafetyRef.current = null;
    }
    if (ttsWsRef.current && ttsWsRef.current.readyState === WebSocket.OPEN) {
      ttsWsRef.current.close();
    }
    ttsWsRef.current = null;
    playbackContextRef.current?.close();
    playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    nextPlayTimeRef.current = 0;
  }, []);

  const sendMessage = async (
    text: string,
    isAudio = false,
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent ?? false;
    if (!text.trim()) return;

    let narrationEndHandled = false;
    const safeEndNarration = () => {
      if (narrationEndHandled) return;
      narrationEndHandled = true;
      if (narrationPlaybackTimerRef.current) {
        clearTimeout(narrationPlaybackTimerRef.current);
        narrationPlaybackTimerRef.current = null;
      }
      if (narrationFinalizeSafetyRef.current) {
        clearTimeout(narrationFinalizeSafetyRef.current);
        narrationFinalizeSafetyRef.current = null;
      }
      onNarrationEnd?.();
    };
    const scheduleEndWhenPlaybackDrains = () => {
      if (narrationPlaybackTimerRef.current) {
        clearTimeout(narrationPlaybackTimerRef.current);
        narrationPlaybackTimerRef.current = null;
      }
      const ctx = playbackContextRef.current;
      if (!ctx) {
        safeEndNarration();
        return;
      }
      const delayMs = Math.max(80, (nextPlayTimeRef.current - ctx.currentTime) * 1000 + 120);
      narrationPlaybackTimerRef.current = window.setTimeout(() => {
        narrationPlaybackTimerRef.current = null;
        safeEndNarration();
      }, delayMs);
    };

    interruptAssistant();

    if (!silent) {
      setMessages(prev => [...prev, { role: 'user', content: text }]);
    }
    setInput('');
    if (!silent) setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      if (isAudio && playbackContextRef.current) {
        void playbackContextRef.current.resume();
      }

      let ttsWs: WebSocket | null = null;
      const ttsQueue: unknown[] = [];
      const contextId = 'ctx-' + Date.now();
      let currentLang = 'fr';
      let ttsReceivedChunk = false;

      if (isAudio) {
        if (!CARTESIA_API_KEY.trim()) {
          console.warn('[Cartesia] NEXT_PUBLIC_CARTESIA_API_KEY / CARTESIA_API_KEY is empty; narration disabled.');
          safeEndNarration();
          return;
        }
        ttsWs = new WebSocket(buildCartesiaTtsWebSocketUrl(CARTESIA_API_KEY));
        ttsWsRef.current = ttsWs;

        ttsWs.onopen = () => {
          void playbackContextRef.current?.resume();
          while (ttsQueue.length > 0) ttsWs!.send(JSON.stringify(ttsQueue.shift()));
        };

        ttsWs.onerror = (e) => console.error('[Cartesia] WebSocket error', e);

        let firstChunk = true;
        ttsWs.onclose = () => {
          if (narrationFinalizeSafetyRef.current) {
            clearTimeout(narrationFinalizeSafetyRef.current);
            narrationFinalizeSafetyRef.current = null;
          }
          if (!ttsReceivedChunk) safeEndNarration();
          else scheduleEndWhenPlaybackDrains();
        };

        ttsWs.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'chunk' && msg.data) {
              ttsReceivedChunk = true;
              if (firstChunk) { firstChunk = false; onNarrationStart?.(); }
              // atob can throw on malformed padding — skip the chunk rather than crash
              let buf: ArrayBuffer;
              try {
                const binaryStr = atob(msg.data);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                buf = bytes.buffer;
              } catch {
                return; // drop malformed chunk, keep playing
              }
              playAudioChunk(buf);
            } else if (msg.type === 'done') {
              if (ttsWs!.readyState === WebSocket.OPEN) ttsWs!.close();
            } else if (msg.type === 'error') {
              console.error('[Cartesia] TTS error:', msg);
              safeEndNarration();
            }
          } catch {
            console.error('[Cartesia] Failed to parse message', e.data);
          }
        };
      }

      const res = await fetch(`${getBackendUrl()}${API_PATHS.cloudTutor('chat')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          is_audio: isAudio,
          narration: isAudio,
          session_id: sessionId,
          course_id: courseCode,
          ...(lessonId !== undefined ? { lesson_id: String(lessonId) } : {}),
          ...(courseTitle ? { course_title: courseTitle } : {}),
          lesson_title: title,
          context: `Cours ${courseCode}, leçon active : ${title}`,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error('Erreur serveur');

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';
      let jsonBuffer   = '';

      setIsLoading(false);
      if (!silent) {
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (isAudio && ttsWs) {
            const voiceId = CARTESIA_VOICES[currentLang as 'fr' | 'en' | 'ar'] ?? CARTESIA_VOICES.fr;
            const endPayload = {
              context_id: contextId,
              model_id: 'sonic-3',
              voice: { mode: 'id', id: voiceId },
              transcript: ' ',
              output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: 44100 },
              language: currentLang,
              continue: false,
            };
            if (ttsWs.readyState === WebSocket.OPEN) ttsWs.send(JSON.stringify(endPayload));
            else ttsQueue.push(endPayload);
          }
          break;
        }

        jsonBuffer += decoder.decode(value, { stream: true });
        let boundary = jsonBuffer.indexOf('\n');

        while (boundary !== -1) {
          const line  = jsonBuffer.slice(0, boundary);
          jsonBuffer  = jsonBuffer.slice(boundary + 1);
          boundary    = jsonBuffer.indexOf('\n');
          if (!line.trim()) continue;
          try {
            const data        = JSON.parse(line);
            const chunk       = data.chunk ?? '';
            const detectedLang = data.lang || 'fr';
            fullResponse     += chunk;

            if (!silent) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
                return updated;
              });
            }

            if (isAudio && data.status === 'streaming' && ttsWs) {
              const cleanText = chunk.replace(/[*#_~>|\-`"']/g, '');
              if (cleanText.trim() !== '') {
                currentLang = detectedLang;
                const voiceId = CARTESIA_VOICES[currentLang as 'fr' | 'en' | 'ar'] ?? CARTESIA_VOICES.fr;
                const payload = {
                  context_id: contextId,
                  model_id: 'sonic-3',
                  voice: { mode: 'id', id: voiceId },
                  transcript: cleanText,
                  output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: 44100 },
                  language: currentLang,
                  continue: true,
                };
                if (ttsWs.readyState === WebSocket.OPEN) ttsWs.send(JSON.stringify(payload));
                else ttsQueue.push(payload);
              }
            }
          } catch { /* malformed chunk */ }
        }
      }

      if (isAudio && ttsWs && !narrationEndHandled) {
        if (narrationFinalizeSafetyRef.current) {
          clearTimeout(narrationFinalizeSafetyRef.current);
          narrationFinalizeSafetyRef.current = null;
        }
        narrationFinalizeSafetyRef.current = window.setTimeout(() => {
          narrationFinalizeSafetyRef.current = null;
          safeEndNarration();
        }, 90_000);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        if (isAudio) safeEndNarration();
      } else {
        if (!silent) {
          setMessages(prev => [...prev, { role: 'assistant', content: '❌ Serveur IA inaccessible.' }]);
        }
        setIsLoading(false);
        if (isAudio) safeEndNarration();
      }
    }
  };

  const streamNarration = useCallback(async (
    lessonTitle: string,
    lessonContent: string,
    bullets: string[],
    examTips: string[],
  ) => {
    void examTips;
    interruptAssistant();
    const ctx = lessonContent?.trim() || (bullets?.length ? bullets.join('\n- ') : '');
    const prompt = ctx
      ? `[CONTEXTE DE LA LEÇON — ${lessonTitle}]:\n${ctx.slice(0, 2000)}\n\nTu es Subul IA. Présente cette leçon de manière engageante et pédagogique en 3-4 phrases.`
      : `Tu es Subul IA. Présente la leçon "${lessonTitle}" en utilisant tes connaissances en cloud computing. Sois engageant et pédagogique.`;
    await sendMessage(prompt, true, { silent: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const startRecording = async () => {
    if (voiceLimitReached) return;
    interruptAssistant();
    onVoiceConsume();
    setLiveTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&smart_format=true&endpointing=100`,
        ['token', DEEPGRAM_API_KEY],
      );
      sttSocketRef.current = socket;

      socket.onopen = () => {
        setIsRecording(true);
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0 && socket.readyState === 1) socket.send(ev.data);
        };
        recorder.start(250);
      };

      let accumulator = '';
      socket.onmessage = (msg) => {
        const received = JSON.parse(msg.data);
        if (received.type === 'Results' && received.channel) {
          const t = received.channel.alternatives[0].transcript;
          if (t && received.is_final) { accumulator += t + ' '; setLiveTranscript(accumulator); }
          else if (t) setLiveTranscript(accumulator + t);
        }
      };

      socket.onclose = () => {
        setIsRecording(false);
        if (accumulator.trim()) sendMessage(accumulator.trim(), true);
        setLiveTranscript('');
        stream.getTracks().forEach(track => track.stop());
      };
    } catch {
      alert('Micro inaccessible. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (sttSocketRef.current?.readyState === 1)
        sttSocketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
    }
  };

  const toggleVoice = () => {
    if (voiceLimitReached) return;
    if (isRecording) stopRecording(); else startRecording();
  };

  useImperativeHandle(ref, () => ({
    primeAudio: () => {
      void playbackContextRef.current?.resume();
    },
    startNarration: streamNarration,
    pauseNarration: () => {
      const ctx = playbackContextRef.current;
      if (ctx && ctx.state === 'running') {
        void ctx.suspend();
      }
    },
    resumeNarration: () => {
      const ctx = playbackContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
    },
    stopNarration: () => { interruptAssistant(); stopAllAudio(); },
  }));

  return (
    <div className="flex h-full flex-col bg-white">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-900 leading-none">Subul IA</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{title}</p>
        </div>

        {/* Voice usage pill (counter only, no cap) */}
        <div
          title={`${voiceUsed} interactions vocales ce mois`}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border shrink-0 bg-slate-50 border-slate-200 text-slate-500"
        >
          <Mic className="h-2.5 w-2.5" />
          <span className="tabular-nums">{voiceUsed}</span>
        </div>

        {isLoading && (
          <button
            onClick={interruptAssistant}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {onClose && !isLoading && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-sm mt-0.5">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl text-[13px] leading-relaxed overflow-hidden',
              msg.role === 'user'
                ? 'bg-primary text-white rounded-tr-none shadow-sm shadow-primary/20'
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm',
            )}>
              {msg.role === 'user' ? (
                <span className="block px-3.5 py-2.5">{msg.content}</span>
              ) : (
                <div className="prose prose-sm max-w-none px-3.5 py-2.5 prose-p:my-1 prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live transcript bubble */}
        {isRecording && liveTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-none px-3.5 py-2.5 bg-primary/20 text-primary text-[13px] italic border border-primary/20">
              {liveTranscript}<span className="animate-pulse"> …</span>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-sm">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-slate-300"
                  style={{ animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="p-3 bg-white shrink-0 border-t border-slate-100">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input.trim(), false); }}>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-primary/40 focus-within:bg-white transition-colors">
            <input
              value={isRecording ? liveTranscript : input}
              onChange={(e) => { if (!isRecording) setInput(e.target.value); }}
              placeholder={
                voiceLimitReached ? 'Posez votre question...'
                  : isRecording ? '🎤 Parlez...'
                  : 'Votre question...'
              }
              disabled={isLoading}
              className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
            />
            <button
              type="button"
              onClick={toggleVoice}
              disabled={isLoading || voiceLimitReached}
              title={voiceLimitReached ? 'Limite mensuelle atteinte' : isRecording ? 'Arrêter' : 'Dicter'}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all shrink-0',
                voiceLimitReached
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : isRecording
                  ? 'bg-red-500 text-white shadow-md animate-pulse'
                  : 'text-slate-400 hover:text-primary hover:bg-primary/10',
              )}
            >
              {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || isRecording || !input.trim()}
              className="h-7 w-7 rounded-xl bg-primary hover:bg-primary/90 shrink-0 shadow-sm"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col bg-white z-[60] overflow-hidden animate-pulse">
      <div className="h-14 border-b border-slate-200 bg-white" />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block w-[300px] border-r border-slate-200 bg-slate-50" />
        <div className="flex-1 p-6 md:p-10 space-y-4">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-10 w-2/3 bg-slate-200 rounded" />
          <div className="h-1 w-14 bg-slate-200 rounded" />
          <div className="h-24 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = pathname.split('/')[1] || 'fr';
  const courseId = params.courseId as string;

  // ── Course data ──
  const {
    data: courseContent,
    isLoading: courseLoading,
    isError: courseError,
    error: courseFetchError,
  } = useCourse(courseId, locale);
  const courseData: CourseContentResponse | null = courseContent ?? null;
  const { data: progressData } = useCourseProgress(courseId, !!courseId);
  const completeLessonMutation = useCompleteLesson(courseId);

  // ── Level ──
  const [currentLevel, setCurrentLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [detectedLevel, setDetectedLevel] = useState<'beginner' | 'intermediate' | null>(null);

  // ── Lesson state ──
  const [currentRef, setCurrentRef]         = useState<LessonRef | null>(null);
  const [allLessons, setAllLessons]         = useState<LessonRef[]>([]);
  const [completedSet, setCompletedSet]     = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  // ── UI state ──
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [showExamTips, setShowExamTips]   = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // ── Enhanced learning state ──
  const [readingProgress, setReadingProgress] = useState(0);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [noteContent, setNoteContent] = useState('');
  const [lessonRating, setLessonRating] = useState<'up' | 'down' | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'tutor' | 'notes' | 'resources'>('tutor');
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(`bookmarks-${courseId}`) ?? '[]')); }
    catch { return new Set(); }
  });
  const [comprehensionAnswers, setComprehensionAnswers] = useState<Record<number, boolean>>({});
  const [comprehensionSubmitted, setComprehensionSubmitted] = useState(false);
  const [expandedBulletIdx, setExpandedBulletIdx] = useState<number | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string>('');
  const [pendingQuestionIsAudio, setPendingQuestionIsAudio] = useState(false);
  const [lessonContentExpanded, setLessonContentExpanded] = useState(false);

  // ── Module Quiz ──
  const [moduleQuizOpen, setModuleQuizOpen]       = useState(false);
  const [moduleQuizSubject, setModuleQuizSubject] = useState('');
  const [moduleQuizIcon, setModuleQuizIcon]       = useState('📚');
  const [moduleQuizLessonContent, setModuleQuizLessonContent] = useState('');
  const [pendingNextRef, setPendingNextRef]       = useState<LessonRef | null>(null);
  const [courseCompletedOpen, setCourseCompletedOpen] = useState(false);
  const [certDownloading, setCertDownloading] = useState(false);

  // ── Shared session ids ──
  const [quizUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'user_default';
    let id = localStorage.getItem('subul_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('subul_user_id', id);
    }
    return id;
  });
  const [quizSessionId] = useState(() => 'quiz_' + Math.random().toString(36).substr(2, 9));

  // ── Monthly voice counter (display-only, backend enforces real quota) ──
  const [voiceUsed, setVoiceUsed] = useState<number>(() => readMonthlyVoice());
  const voiceLimitReached = false;

  const consumeVoiceCredit = useCallback(() => {
    setVoiceUsed(prev => {
      const next = prev + 1;
      writeMonthlyVoice(next);
      return next;
    });
  }, []);

  // ── Agent voice controls ──
  const [agentState, setAgentState] = useState<'idle' | 'loading' | 'speaking' | 'paused'>('idle');
  const agentAbortRef    = useRef<AbortController | null>(null);
  const agentSessionRef  = useRef(0);
  const chatRef          = useRef<AIChatHandle | null>(null);
  const avatarRef        = useRef<AvatarTeacherHandle | null>(null);
  const [avatarReady, setAvatarReady]   = useState(false);
  const avatarReadyRef   = useRef(false);
  useEffect(() => { avatarReadyRef.current = avatarReady; }, [avatarReady]);
  const isAutoPlayRef    = useRef(false);
  const currentRefRef    = useRef<LessonRef | null>(null);
  const allLessonsRef    = useRef<LessonRef[]>([]);

  // ── Fetch quiz-detected level ──
  useEffect(() => {
    async function fetchDetectedLevel() {
      try {
        const assessment = await quizResultsService.getLatestAssessmentResult();
        if (!assessment) return;
        const domain = getQuizDomain(assessment.scores, assessment.primaryProfile);
        const levelResult = await quizResultsService.getLatestQuizLevelResult(domain);
        if (!levelResult) return;
        const mapped = mapQuizLevelToCourseLevel(levelResult.level);
        setDetectedLevel(mapped);
        setCurrentLevel(mapped);
      } catch {
        // No quiz result yet — keep default
      }
    }
    fetchDetectedLevel();
  }, []);

  const levelData: CourseLevel | undefined = courseData?.levels.find(
    (l) => l.level === currentLevel,
  );

  // ── Init on level / courseData / progress change ──
  useEffect(() => {
    if (!courseData || !levelData) return;

    const refs = buildLessonRefs(levelData.modules);
    setAllLessons(refs);
    setCurrentRef(prev => {
      if (!prev) return refs[0] ?? null;
      return refs.find(r => r.moduleId === prev.moduleId && r.lessonId === prev.lessonId) ?? refs[0] ?? null;
    });
    setShowExamTips(false);
    setExpandedModules(new Set(levelData.modules.map((m) => m.id)));

    // Hydrate completedSet from backend, then localStorage
    if (progressData?.completedLessons?.length) {
      const fromApi = new Set<number>();
      progressData.completedLessons.forEach((key) => {
        const match = /^module_(\d+)_lesson_(\d+)$/.exec(key);
        if (match) {
          const ref = refs.find(
            (r) => r.moduleId === parseInt(match[1], 10) && r.lessonId === parseInt(match[2], 10),
          );
          if (ref != null) fromApi.add(ref.globalIndex);
        }
      });
      setCompletedSet(fromApi);
    } else {
      const stored = localStorage.getItem(`course-lessons-${courseId}-${currentLevel}`);
      setCompletedSet(stored ? new Set(JSON.parse(stored)) : new Set());
    }
  }, [currentLevel, courseId, courseData, progressData, levelData]);

  // Reset exam tips + reading state on lesson change
  useEffect(() => {
    setShowExamTips(false);
    setReadingProgress(0);
    setComprehensionAnswers({});
    setComprehensionSubmitted(false);
    setExpandedBulletIdx(null);
    setPendingQuestion('');
    setPendingQuestionIsAudio(false);
    setLessonContentExpanded(false);
    if (!currentRef) return;
    const savedNote = typeof window !== 'undefined'
      ? localStorage.getItem(`lesson-note-${courseId}-${currentRef.lessonId}`) ?? ''
      : '';
    setNoteContent(savedNote);
    const savedRating = typeof window !== 'undefined'
      ? (localStorage.getItem(`lesson-rating-${courseId}-${currentRef.lessonId}`) as 'up' | 'down' | null)
      : null;
    setLessonRating(savedRating);
  }, [currentRef?.globalIndex, courseId]);

  // ── Enhanced learning handlers ──
  const handleMainScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) { setReadingProgress(100); return; }
    setReadingProgress(Math.round((el.scrollTop / scrollable) * 100));
  }, []);

  const toggleBookmark = useCallback(() => {
    if (!currentRef) return;
    setBookmarkedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(currentRef.lessonId)) next.delete(currentRef.lessonId);
      else next.add(currentRef.lessonId);
      localStorage.setItem(`bookmarks-${courseId}`, JSON.stringify([...next]));
      return next;
    });
  }, [currentRef, courseId]);

  const saveNote = useCallback((text: string) => {
    setNoteContent(text);
    if (!currentRef) return;
    localStorage.setItem(`lesson-note-${courseId}-${currentRef.lessonId}`, text);
  }, [currentRef, courseId]);

  const rateLesson = useCallback((rating: 'up' | 'down') => {
    if (!currentRef) return;
    const next = lessonRating === rating ? null : rating;
    setLessonRating(next);
    if (next) localStorage.setItem(`lesson-rating-${courseId}-${currentRef.lessonId}`, next);
    else localStorage.removeItem(`lesson-rating-${courseId}-${currentRef.lessonId}`);
  }, [currentRef, courseId, lessonRating]);

  // ── Handlers ──
  const toggleModule = (id: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markLessonCompleted = useCallback(
    (ref: LessonRef) => {
      setCompletedSet((prev) => {
        const next = new Set(prev);
        next.add(ref.globalIndex);
        localStorage.setItem(
          `course-lessons-${courseId}-${currentLevel}`,
          JSON.stringify([...next]),
        );
        return next;
      });
      completeLessonMutation.mutate(
        { moduleOrder: ref.moduleId, lessonOrder: ref.lessonId },
        { onError: () => {} },
      );
    },
    [courseId, currentLevel, completeLessonMutation],
  );

  const goNext = useCallback(() => {
    if (!currentRef) return;
    markLessonCompleted(currentRef);

    const nextIndex  = currentRef.globalIndex + 1;
    const nextLesson = nextIndex < allLessons.length ? allLessons[nextIndex] : null;
    if (!nextLesson) {
      setCourseCompletedOpen(true);
      return;
    }
    const isLastInModule = !nextLesson || nextLesson.moduleId !== currentRef.moduleId;

    if (isLastInModule) {
      const moduleLessons = allLessons.filter((r) => r.moduleId === currentRef.moduleId);

      // Guard-rail: count substantive words across all lessons in this module.
      // If total content is below threshold, skip the quiz — a poor quiz is worse than no quiz.
      const MIN_WORDS = 120;
      const MIN_LESSONS = 2;
      const totalWords = moduleLessons.reduce((sum, r) => {
        const text = [r.lesson.title, r.lesson.content, ...(r.lesson.bullets ?? [])].join(' ');
        return sum + text.trim().split(/\s+/).filter(Boolean).length;
      }, 0);

      const hasEnoughContent = moduleLessons.length >= MIN_LESSONS && totalWords >= MIN_WORDS;

      if (!hasEnoughContent) {
        // Not enough content → skip quiz, go straight to next lesson/module
        setPendingNextRef(nextLesson);
        setCurrentRef(nextLesson);
        return;
      }

      setModuleQuizSubject(currentRef.moduleTitle);
      setModuleQuizIcon(currentRef.moduleIcon);

      // Build lesson context: titles + key points for every lesson in this module.
      // This ensures quiz questions are grounded in exactly what was studied.
      const lessonCtx = moduleLessons
        .map((r, i) => {
          const bullets = r.lesson.bullets?.length
            ? `\n   Points clés : ${r.lesson.bullets.slice(0, 5).join(' | ')}`
            : '';
          const tips = r.lesson.examTips?.length
            ? `\n   Conseils exam : ${r.lesson.examTips.slice(0, 3).join(' | ')}`
            : '';
          return `${i + 1}. ${r.lesson.title}${bullets}${tips}`;
        })
        .join('\n');
      setModuleQuizLessonContent(`Module : ${currentRef.moduleTitle}\n\nLeçons :\n${lessonCtx}`);

      setPendingNextRef(nextLesson);
      setModuleQuizOpen(true);
    } else {
      setCurrentRef(nextLesson);
    }
  }, [currentRef, allLessons, markLessonCompleted]);

  const handleModuleQuizClose = useCallback(() => {
    setModuleQuizOpen(false);
    if (pendingNextRef) setCurrentRef(pendingNextRef);
    setPendingNextRef(null);
  }, [pendingNextRef]);

  const goPrev = useCallback(() => {
    if (!currentRef || currentRef.globalIndex === 0) return;
    setCurrentRef(allLessons[currentRef.globalIndex - 1]);
  }, [currentRef, allLessons]);

  // Keep refs in sync so auto-play callbacks avoid stale closures
  useEffect(() => { currentRefRef.current = currentRef; }, [currentRef]);
  useEffect(() => { allLessonsRef.current = allLessons; }, [allLessons]);

  // ── Agent Voice ───────────────────────────────────────────────────────────

  const agentStopAll = useCallback(() => {
    isAutoPlayRef.current = false;
    agentSessionRef.current++;
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    chatRef.current?.stopNarration();
    avatarRef.current?.stopSpeaking();
    setAgentState('idle');
  }, []);

  const agentStartNarration = useCallback(() => {
    if (!currentRef || agentState !== 'idle') return;
    if (!CARTESIA_API_KEY.trim()) {
      console.warn('[Narration] Missing Cartesia key in client env.');
      return;
    }
    agentStopAll();
    setAgentState('loading');
    chatRef.current?.primeAudio();

    const { lesson } = currentRef;
    chatRef.current?.startNarration(
      lesson.title,
      lesson.content,
      lesson.bullets,
      lesson.examTips ?? [],
    );
  }, [currentRef, agentState, agentStopAll]);

  // Called when a narration finishes — advances to the next slide if auto-playing
  const handleNarrationEnd = useCallback(() => {
    setAgentState('idle');
    if (!isAutoPlayRef.current) return;
    const cur = currentRefRef.current;
    if (!cur) { isAutoPlayRef.current = false; return; }
    markLessonCompleted(cur);
    const lessons = allLessonsRef.current;
    const nextIndex = cur.globalIndex + 1;
    if (nextIndex >= lessons.length) {
      isAutoPlayRef.current = false;
      setCourseCompletedOpen(true);
      return;
    }
    const next = lessons[nextIndex];
    setCurrentRef(next);
    setTimeout(() => {
      if (!isAutoPlayRef.current) return;
      setAgentState('loading');
      if (avatarReadyRef.current) {
        avatarRef.current?.startSpeaking(
          next.lesson.title, next.lesson.content,
          next.lesson.bullets, next.lesson.examTips ?? [],
        );
      } else {
        chatRef.current?.startNarration(
          next.lesson.title, next.lesson.content,
          next.lesson.bullets, next.lesson.examTips ?? [],
        );
      }
    }, 400);
  }, [markLessonCompleted]);

  // Start auto-play from slide 1
  const handleStartAutoPlay = useCallback(() => {
    const useAvatar = avatarReadyRef.current;
    if (!allLessons.length || (!useAvatar && !CARTESIA_API_KEY.trim())) return;
    agentSessionRef.current++;
    agentAbortRef.current?.abort();
    agentAbortRef.current = null;
    chatRef.current?.stopNarration();
    avatarRef.current?.stopSpeaking();
    setAgentState('loading');
    if (!useAvatar) chatRef.current?.primeAudio();
    isAutoPlayRef.current = true;
    const first = allLessons[0];
    setCurrentRef(first);
    setTimeout(() => {
      if (!isAutoPlayRef.current) return;
      if (avatarReadyRef.current) {
        avatarRef.current?.startSpeaking(
          first.lesson.title, first.lesson.content,
          first.lesson.bullets, first.lesson.examTips ?? [],
        );
      } else {
        chatRef.current?.startNarration(
          first.lesson.title, first.lesson.content,
          first.lesson.bullets, first.lesson.examTips ?? [],
        );
      }
    }, 100);
  }, [allLessons]);

  const agentPauseNarration = useCallback(() => {
    if (agentState !== 'speaking') return;
    if (avatarReadyRef.current) {
      avatarRef.current?.pauseSpeaking();
    } else {
      chatRef.current?.pauseNarration();
    }
    setAgentState('paused');
  }, [agentState]);

  const agentResumeNarration = useCallback(() => {
    if (agentState !== 'paused') return;
    if (avatarReadyRef.current) {
      avatarRef.current?.resumeSpeaking();
    } else {
      chatRef.current?.resumeNarration();
    }
    setAgentState('speaking');
  }, [agentState]);

  useEffect(() => { return () => { agentAbortRef.current?.abort(); }; }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  // ── Guards ──
  if (courseLoading) return <LoadingSkeleton />;
  if (courseError || !courseData) {
    const status = Number((courseFetchError as any)?.response?.status ?? 0);
    const message =
      status === 403
        ? 'Ce cours est verrouille pour votre abonnement actuel.'
        : status === 404
          ? 'Cours introuvable.'
          : 'Impossible de charger ce cours.';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/learner/cours`)}>
          Retour aux cours
        </Button>
      </div>
    );
  }
  if (!levelData) return <LoadingSkeleton />;
  if (!currentRef) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold text-foreground">Contenu non disponible</p>
        <p className="text-muted-foreground text-center max-w-md">
          Ce cours ne contient pas encore de leçons. Veuillez réessayer plus tard.
        </p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/learner/cours`)}>
          Retour aux cours
        </Button>
      </div>
    );
  }

  const lessonProgress = allLessons.length > 0
    ? Math.round((completedSet.size / allLessons.length) * 100)
    : 0;
  const isLast        = currentRef.globalIndex === allLessons.length - 1;
  const currentModule = levelData.modules.find((m) => m.id === currentRef.moduleId);
  const totalInModule = currentModule?.lessons.length ?? 0;
  const totalModules = levelData.modules.length;
  const totalLessons = allLessons.length;
  const totalLabs = levelData.modules.reduce(
    (count, module: any) => count + (Array.isArray(module?.labs) ? module.labs.length : 0),
    0,
  );

  // ── Derived lesson metadata ──
  const moduleIndex = levelData.modules.findIndex((m) => m.id === currentRef.moduleId);
  const lessonPosInModule = currentModule?.lessons.findIndex((l) => l.id === currentRef.lessonId) ?? 0;
  const lessonLabel = `Leçon ${moduleIndex + 1}.${lessonPosInModule + 1} sur ${totalInModule}`;

  const readingTime = Math.max(1, Math.ceil(
    (currentRef.lesson.content ?? '').split(/\s+/).filter(Boolean).length / 200,
  ));

  const lessonPoints = currentRef.lesson.bullets.length;

  const lessonObjective = (() => {
    const content = currentRef.lesson.content ?? '';
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    return firstSentence && firstSentence.length > 20
      ? firstSentence
      : `Comprendre le rôle de ${currentRef.lesson.title} et comment il s'intègre avec les services associés.`;
  })();

  const metadataChips = [
    { label: 'Domaine', value: currentRef.moduleTitle },
    { label: 'Niveau', value: currentLevel === 'beginner' ? 'Débutant' : 'Intermédiaire' },
    { label: 'Compétence évaluée', value: currentLevel === 'beginner' ? 'Comprendre et expliquer' : 'Appliquer et analyser' },
    { label: 'Examen', value: courseId },
  ];

  const lessonResources = [
    { id: 'doc', title: `${courseId} Documentation officielle`, type: 'Documentation', duration: `${readingTime * 3} min` },
    { id: 'guide', title: `${courseId} Study Guide`, type: 'PDF', duration: `${totalLessons * 4} pages` },
    { id: 'learn', title: 'Microsoft Learn Path', type: 'Module', duration: `${Math.ceil(totalLessons * 0.2)}h` },
  ];

  const lessonFaqs = [
    { id: 0, q: `Qu'est-ce que ${currentRef.lesson.title} ?` },
    { id: 1, q: `Comment ${currentRef.moduleTitle} s'applique-t-il en pratique ?` },
  ];

  // Comprehension check: use first 3 bullets as "true" statements to confirm
  const comprehensionItems = currentRef.lesson.bullets.slice(0, 3).map((b, i) => ({
    id: i,
    statement: b,
  }));
  const comprehensionAllAnswered = comprehensionItems.length > 0 &&
    comprehensionItems.every((item) => comprehensionAnswers[item.id] !== undefined);
  const comprehensionScore = comprehensionItems.filter((item) => comprehensionAnswers[item.id] === true).length;

  const isBookmarked = bookmarkedLessons.has(currentRef.lessonId);
  const noteHasContent = noteContent.trim().length > 0;

  // Helper: send a pre-filled question to the AI tutor.
  // withContext=true embeds lesson content so AI can answer even when not yet indexed.
  // isAudio=true reads the response aloud via Cartesia TTS.
  const askTutor = (question: string, withContext = false, isAudio = false) => {
    let msg = question;
    if (withContext) {
      const content = currentRef.lesson.content?.trim();
      const bulletsText = (currentRef.lesson.bullets ?? []).join('\n- ');
      if (content) {
        msg = `${question}\n\n[CONTEXTE DE LA LEÇON — ${currentRef.lesson.title}]:\n${content.slice(0, 1800)}`;
      } else if (bulletsText) {
        msg = `${question}\n\n[POINTS CLÉS — ${currentRef.lesson.title}]:\n- ${bulletsText}`;
      }
    }
    setPendingQuestionIsAudio(isAudio);
    setPendingQuestion(msg);
    setRightPanelTab('tutor');
  };

  const estimatedCourseTimeLeft = (() => {
    const remaining = allLessons.length - completedSet.size;
    const avgMin = Math.max(1, readingTime);
    const total = remaining * avgMin;
    if (total < 60) return `${total} min restantes`;
    return `~${Math.ceil(total / 60)}h restantes`;
  })();

  return (
    <div className="fixed inset-0 flex flex-col bg-white z-[60] overflow-hidden">
      {/* Narration uses Cartesia WebSocket + cloud tutor stream; component must be mounted or chatRef stays null and no audio plays. */}
      <div className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
        <AIChatPanel
          ref={chatRef}
          title={currentRef.lesson.title}
          courseCode={courseId}
          courseTitle={courseData.title}
          lessonId={currentRef.lessonId}
          voiceUsed={voiceUsed}
          voiceMax={VOICE_MAX}
          onVoiceConsume={consumeVoiceCredit}
          onNarrationStart={() => {
            setAgentState('speaking');
            consumeVoiceCredit();
          }}
          onNarrationEnd={handleNarrationEnd}
          onAudioChunk={(f32, sr) => avatarRef.current?.sendAudioChunk(f32, sr)}
        />
      </div>
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* ═══ HEADER ═════════════════════════════════════════════════════════ */}
      <header className="shrink-0 h-14 border-b border-slate-200 bg-white flex items-center gap-2 px-3 sm:px-4 z-30">
        <button
          onClick={() => router.push(`/${locale}/dashboard/learner/cours`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0 hidden lg:block" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-3 w-3" />
            Learning Content
          </span>
          <span className="font-bold text-slate-800 shrink-0 truncate text-xs sm:text-sm">{courseId}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0 hidden sm:block" />
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
            currentLevel === 'beginner' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'
          )}>
            {currentLevel === 'beginner' ? '🟢 Débutant' : '🔵 Intermédiaire'}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0 hidden sm:block" />
          <span className="font-semibold text-slate-900 truncate text-xs sm:text-sm">
            {currentRef.lesson.title}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Time remaining */}
          <span className="hidden lg:flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
            <Clock className="h-3 w-3" />
            {estimatedCourseTimeLeft}
          </span>

          {/* Progress */}
          <div className="hidden xs:flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
            <div className="h-2 w-16 sm:w-24 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                style={{ width: `${lessonProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600">{lessonProgress}%</span>
          </div>

          {/* Font size toggle */}
          <button
            onClick={() => setFontSize((f) => f === 'normal' ? 'large' : 'normal')}
            title={fontSize === 'normal' ? 'Agrandir le texte' : 'Taille normale'}
            className={cn(
              'hidden md:flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              fontSize === 'large' ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-100',
            )}
          >
            <ALargeSmall className="h-4 w-4" />
          </button>

          {/* Language switcher — always accessible inside the immersive view */}
          <LanguageSwitcher variant="compact" className="hidden sm:block" />

          {/* Notes shortcut */}
          <button
            onClick={() => { setRightPanelTab('notes'); setMobileChatOpen(true); }}
            title="Mes notes"
            className={cn(
              'hidden md:flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors',
              noteHasContent ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'text-slate-400 hover:bg-slate-100',
            )}
          >
            <PenLine className="h-3.5 w-3.5" />
            {noteHasContent && <span className="hidden lg:inline">Notes</span>}
          </button>

          {/* Mobile AI assistant */}
          <button
            onClick={() => setMobileChatOpen(!mobileChatOpen)}
            className={cn(
              'xl:hidden flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all',
              mobileChatOpen
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Assistant IA</span>
          </button>
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <CourseSidebar
              courseCode={courseId}
              courseTitle={courseData.title}
              currentLevel={currentLevel}
              onLevelChange={setCurrentLevel}
              detectedLevel={detectedLevel}
              modules={levelData.modules}
              allLessons={allLessons}
              currentRef={currentRef}
              completedSet={completedSet}
              expandedModules={expandedModules}
              toggleModule={toggleModule}
              onSelectLesson={(ref) => {
                setCurrentRef(ref);
                setShowExamTips(false);
              }}
              onOpenAssistant={() => setMobileChatOpen(true)}
            />
          )}
        </AnimatePresence>

        {/* ── Content + Chat ── */}
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto min-h-0 min-w-0 relative" onScroll={handleMainScroll}>
            {/* Reading progress bar */}
            <div className="sticky top-0 left-0 right-0 h-0.5 bg-slate-100 z-10">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                animate={{ width: `${readingProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`lesson-${currentRef.moduleId}-${currentRef.lessonId}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="px-5 sm:px-8 md:px-10 py-6 max-w-3xl mx-auto pb-28"
              >
                {/* ── Breadcrumb ── */}
                <button
                  onClick={() => router.push(`/${locale}/dashboard/learner/cours`)}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour au tableau de bord
                </button>

                {/* ── Lesson position + type + actions ── */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      {lessonLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      <FileText className="h-3 w-3" />
                      {currentRef.moduleTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={toggleBookmark}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                        isBookmarked
                          ? 'border-violet-300 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700',
                      )}
                      title={isBookmarked ? 'Retirer des favoris' : 'Enregistrer cette leçon'}
                    >
                      <Bookmark className={cn('h-3.5 w-3.5', isBookmarked && 'fill-current')} />
                      <span className="hidden sm:inline">{isBookmarked ? 'Enregistré' : 'Enregistrer'}</span>
                    </button>
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Title ── */}
                <h1 className={cn(
                  'font-black text-slate-900 leading-tight',
                  fontSize === 'large' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
                )}>
                  {currentRef.lesson.title}
                </h1>

                {/* ── Metadata row ── */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {readingTime} min de lecture
                  </span>
                  {lessonPoints > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      {lessonPoints} points
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-violet-400" />
                    Concept clé
                  </span>
                </div>

                {/* ── "Dans cette leçon, vous allez" card ── */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50/60">
                  <div className="flex items-start gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-violet-600 shrink-0" />
                        <h2 className="text-sm font-bold text-violet-900">Dans cette leçon, vous allez</h2>
                      </div>
                      <p className="text-sm leading-relaxed text-violet-800/80">{lessonObjective}</p>
                    </div>
                    <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-violet-100">
                      <Brain className="h-8 w-8 text-violet-500" />
                    </div>
                  </div>
                </div>

                {/* ── Aperçu de la leçon ── */}
                <div className="mt-7 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-violet-50 via-indigo-50/60 to-white border-b border-slate-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-violet-100 shrink-0">
                      <BookOpen className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-bold text-slate-900">Aperçu de la leçon</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">{readingTime} min de lecture · {lessonPoints} points clés</p>
                    </div>
                  </div>

                  {/* Decorative accent bar */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-violet-400 via-indigo-400 to-transparent" />

                  {/* Content body */}
                  <div className="px-5 py-5 bg-white">
                    <div className={cn(
                      'prose prose-slate max-w-none',
                      fontSize === 'large' ? 'prose-base' : 'prose-sm',
                      '[&>p]:text-slate-600 [&>p]:leading-[1.85] [&>p]:mb-4 [&>p]:last:mb-0',
                      '[&>h1]:text-slate-900 [&>h1]:font-bold [&>h2]:text-slate-900 [&>h2]:font-bold [&>h3]:text-slate-800',
                      '[&>h2]:mt-6 [&>h3]:mt-4 [&>h2]:mb-2 [&>h3]:mb-1.5',
                      '[&>ul]:text-slate-600 [&>ul]:pl-5 [&>li]:leading-relaxed [&>li]:mb-1',
                      '[&>strong]:text-slate-800 [&>strong]:font-semibold [&>em]:text-violet-700',
                      '[&>code]:bg-violet-50 [&>code]:border [&>code]:border-violet-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-violet-700 [&>code]:text-xs [&>code]:font-mono',
                      '[&>blockquote]:border-l-4 [&>blockquote]:border-violet-300 [&>blockquote]:bg-violet-50/50 [&>blockquote]:px-4 [&>blockquote]:py-2 [&>blockquote]:rounded-r-xl [&>blockquote]:italic [&>blockquote]:text-slate-500 [&>blockquote]:my-3',
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {lessonContentExpanded
                          ? currentRef.lesson.content
                          : (currentRef.lesson.content ?? '').slice(0, 500)}
                      </ReactMarkdown>
                    </div>
                    {(currentRef.lesson.content ?? '').length > 500 && (
                      <button
                        onClick={() => setLessonContentExpanded((v) => !v)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', lessonContentExpanded && 'rotate-180')} />
                        {lessonContentExpanded
                          ? (locale === 'fr' ? 'Réduire' : 'Show less')
                          : (locale === 'fr' ? 'Lire la suite' : 'Read more')}
                      </button>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center gap-3 px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                    <button
                      onClick={() => askTutor(locale === 'fr'
                        ? `Explique-moi cette leçon "${currentRef.lesson.title}" de façon simple.`
                        : `Explain this lesson "${currentRef.lesson.title}" in a simple way.`
                      , true)}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {locale === 'fr' ? 'Expliquer avec l\'IA' : 'Explain with AI'}
                    </button>
                    <button
                      onClick={() => askTutor(locale === 'fr'
                        ? `Donne-moi un mini quiz de 3 questions sur la leçon "${currentRef.lesson.title}".`
                        : `Give me a 3-question mini quiz on the lesson "${currentRef.lesson.title}".`
                      , true)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Brain className="h-3 w-3" />
                      {locale === 'fr' ? 'Quiz rapide' : 'Quick quiz'}
                    </button>
                  </div>
                </div>

                {/* ── Metadata chips grid ── */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {metadataChips.map((chip) => (
                    <div key={chip.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{chip.label}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-800 leading-tight">{chip.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Conseil d'apprentissage ── */}
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                    <Lightbulb className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sky-900">Conseil d&apos;apprentissage</p>
                    <p className="mt-1 text-xs leading-relaxed text-sky-700/80">
                      Prenez des notes, mettez en pause si nécessaire et testez vos connaissances avec le quiz à la fin de la leçon.
                    </p>
                  </div>
                </div>

                {/* ── Concepts essentiels ── */}
                {currentRef.lesson.bullets.length > 0 && (
                  <section className="mt-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 shrink-0">
                        <BookOpen className="h-4 w-4 text-violet-600" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">Concepts essentiels</h2>
                      <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
                        {currentRef.lesson.bullets.length} points
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentRef.lesson.bullets.map((bullet, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.04 * i }}
                          className="flex items-start gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-violet-200 hover:shadow-md transition-all group cursor-default"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold mt-0.5 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-700 leading-relaxed">{bullet}</span>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Approfondissement par concept ── */}
                {currentRef.lesson.bullets.length > 0 && (
                  <section className="mt-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 shrink-0">
                        <Brain className="h-4 w-4 text-indigo-600" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">Approfondissement</h2>
                      <span className="ml-auto text-[11px] text-slate-400 font-medium">Cliquez pour développer</span>
                    </div>
                    <div className="space-y-2">
                      {currentRef.lesson.bullets.map((bullet, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                          <button
                            onClick={() => setExpandedBulletIdx(expandedBulletIdx === i ? null : i)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                              {i + 1}
                            </div>
                            <span className="flex-1 text-sm font-medium text-slate-700 leading-snug">{bullet}</span>
                            <ChevronDown className={cn(
                              'h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200',
                              expandedBulletIdx === i && 'rotate-180',
                            )} />
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedBulletIdx === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-indigo-50/30 space-y-3">
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    Ce concept fait partie de <strong className="text-slate-700">{currentRef.moduleTitle}</strong>.
                                    Utilisez l&apos;Assistant IA pour une explication approfondie avec des exemples concrets.
                                  </p>
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => askTutor(`Explique-moi en détail ce concept : "${bullet}"`, true, true)}
                                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      Expliquer ce concept
                                    </button>
                                    <button
                                      onClick={() => askTutor(`Donne-moi un exemple concret et pratique pour : "${bullet}"`, true, true)}
                                      className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                                    >
                                      <Lightbulb className="h-3 w-3" />
                                      Donner un exemple
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Scénario pratique ── */}
                <section className="mt-8">
                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-100 bg-emerald-50/80">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                        <FlaskConical className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-emerald-900">Scénario pratique</h2>
                        <p className="text-[11px] text-emerald-600 mt-0.5">Mettez ce concept en contexte réel</p>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-sm text-emerald-900 leading-relaxed">
                        <span className="font-bold">💼 Situation :</span> Vous êtes architecte cloud dans une entreprise de 300 employés.
                        Votre manager vous demande d&apos;évaluer les options pour <em className="font-semibold not-italic">{currentRef.lesson.title}</em>.
                      </p>
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        <span className="font-bold">❓ Défi :</span> En vous appuyant sur les concepts essentiels de cette leçon, quels critères utiliseriez-vous pour justifier votre choix ?
                      </p>
                      <button
                        onClick={() => askTutor(locale === 'fr'
                          ? `Je suis architecte cloud. Pour "${currentRef.lesson.title}", quels critères utiliser pour justifier mon choix ?`
                          : `I'm a cloud architect. For "${currentRef.lesson.title}", what criteria should I use to justify my choice?`
                        , true, true)}
                        className="mt-1 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Discuter de ce scénario avec l&apos;Assistant IA
                      </button>
                    </div>
                  </div>
                </section>

                {/* ── Exam tips ── */}
                {(currentRef.lesson.examTips ?? []).length > 0 && (
                  <section className="mt-8">
                    <button
                      onClick={() => setShowExamTips(!showExamTips)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left',
                        showExamTips
                          ? 'bg-amber-50 border-amber-200 rounded-b-none'
                          : 'bg-amber-50/60 border-amber-100 hover:bg-amber-50 hover:border-amber-200',
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 shrink-0">
                        <Target className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-amber-900">Astuces pour l&apos;examen</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {(currentRef.lesson.examTips ?? []).length} conseil
                          {(currentRef.lesson.examTips ?? []).length > 1 ? 's' : ''} clé
                          {(currentRef.lesson.examTips ?? []).length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronDown className={cn(
                        'h-5 w-5 text-amber-500 transition-transform duration-200 shrink-0',
                        showExamTips && 'rotate-180',
                      )} />
                    </button>

                    <AnimatePresence>
                      {showExamTips && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border border-t-0 border-amber-200 rounded-b-2xl bg-amber-50/40 space-y-3">
                            {(currentRef.lesson.examTips ?? []).map((tip, i) => (
                              <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
                                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-amber-900 leading-relaxed">{tip}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                )}
                {/* ── Comprehension check ── */}
                {comprehensionItems.length > 0 && (
                  <section className="mt-8">
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 shrink-0">
                          <CheckCheck className="h-4 w-4 text-violet-600" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-sm font-bold text-slate-900">Vérification des acquis</h2>
                          <p className="text-[11px] text-slate-400 mt-0.5">Confirmez les concepts que vous avez compris</p>
                        </div>
                        {comprehensionSubmitted && (
                          <span className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-full',
                            comprehensionScore === comprehensionItems.length
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700',
                          )}>
                            {comprehensionScore}/{comprehensionItems.length} compris
                          </span>
                        )}
                      </div>
                      <div className="p-5 space-y-3">
                        {comprehensionItems.map((item) => {
                          const answered = comprehensionAnswers[item.id];
                          return (
                            <div key={item.id} className={cn(
                              'flex items-start gap-3 p-3.5 rounded-xl border transition-all',
                              comprehensionSubmitted
                                ? answered === true
                                  ? 'border-emerald-200 bg-emerald-50/50'
                                  : 'border-rose-200 bg-rose-50/50'
                                : 'border-slate-100 bg-slate-50/50',
                            )}>
                              <p className={cn(
                                'flex-1 text-sm leading-relaxed',
                                comprehensionSubmitted && answered === true ? 'text-emerald-800' : 'text-slate-700',
                              )}>
                                {item.statement}
                              </p>
                              {!comprehensionSubmitted && (
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    onClick={() => setComprehensionAnswers((p) => ({ ...p, [item.id]: true }))}
                                    className={cn(
                                      'h-7 px-2.5 rounded-lg text-xs font-bold transition-all border',
                                      answered === true
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600',
                                    )}
                                  >
                                    Compris ✓
                                  </button>
                                  <button
                                    onClick={() => setComprehensionAnswers((p) => ({ ...p, [item.id]: false }))}
                                    className={cn(
                                      'h-7 px-2.5 rounded-lg text-xs font-bold transition-all border',
                                      answered === false
                                        ? 'bg-rose-500 text-white border-rose-500'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-600',
                                    )}
                                  >
                                    À revoir
                                  </button>
                                </div>
                              )}
                              {comprehensionSubmitted && (
                                <span className="shrink-0 text-sm">
                                  {answered === true ? '✅' : '🔄'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {!comprehensionSubmitted && (
                          <button
                            disabled={!comprehensionAllAnswered}
                            onClick={() => setComprehensionSubmitted(true)}
                            className={cn(
                              'w-full mt-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                              comprehensionAllAnswered
                                ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                            )}
                          >
                            Valider ma compréhension
                          </button>
                        )}
                        {comprehensionSubmitted && comprehensionScore < comprehensionItems.length && (
                          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                              Relisez les points marqués <strong>À revoir</strong> ci-dessus, puis demandez à l&apos;Assistant IA de vous expliquer davantage.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* ── Lab pratique CTA ── */}
                <section className="mt-6">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/60 hover:border-violet-200 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/${locale}/dashboard/learner/labs`)}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-violet-100">
                      <FlaskConical className="h-6 w-6 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-violet-900">Pratiquer avec un lab</p>
                      <p className="text-xs text-violet-700/70 mt-0.5">
                        Mettez en pratique <strong>{currentRef.moduleTitle}</strong> dans un environnement cloud réel
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-violet-400 group-hover:text-violet-600 transition-colors shrink-0" />
                  </div>
                </section>

                {/* ── Lesson rating ── */}
                <section className="mt-6 mb-4">
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                    <p className="text-sm font-medium text-slate-600">Cette leçon était-elle claire ?</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => rateLesson('up')}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                          lessonRating === 'up'
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600',
                        )}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Oui
                      </button>
                      <button
                        onClick={() => rateLesson('down')}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                          lessonRating === 'down'
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-600',
                        )}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        À améliorer
                      </button>
                    </div>
                  </div>
                  {lessonRating && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-center text-slate-400 mt-2"
                    >
                      {lessonRating === 'up' ? '🙏 Merci pour votre retour !' : '📝 Merci, nous allons améliorer cette leçon.'}
                    </motion.p>
                  )}
                </section>

              </motion.div>
            </AnimatePresence>
          </main>

          {/* ── Right panel: Tabbed (Tutor / Notes / Ressources) ── */}
          <div className="hidden xl:flex w-[380px] shrink-0 border-l border-slate-100 flex-col overflow-hidden bg-white">

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-slate-100 bg-slate-50/50">
              {([
                { id: 'tutor' as const,     label: 'Assistant IA', icon: MessageSquare, dot: false },
                { id: 'notes' as const,     label: 'Mes notes',    icon: PenLine,       dot: noteHasContent },
                { id: 'resources' as const, label: 'Ressources',   icon: LayoutList,    dot: false },
              ]).map(({ id, label, icon: Icon, dot }) => (
                <button
                  key={id}
                  onClick={() => setRightPanelTab(id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all relative',
                    rightPanelTab === id
                      ? 'text-violet-700 border-b-2 border-violet-600 bg-white'
                      : 'text-slate-400 hover:text-slate-700',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {dot && <span className="absolute top-2 right-3 h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>
              ))}
            </div>

            {/* Tab: AI Tutor */}
            {rightPanelTab === 'tutor' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <UniversalTutor
                  contextType="course"
                  contextTitle={currentRef.lesson.title}
                  contextItems={currentRef.lesson.bullets}
                  isOpen
                  onToggle={() => {}}
                  locale={locale}
                  courseId={courseId}
                  lessonId={currentRef.lessonId}
                  courseTitle={courseData.title}
                  lessonTitle={currentRef.lesson.title}
                  className="h-full w-full border-0"
                  pendingQuestion={pendingQuestion}
                  onPendingQuestionSent={() => { setPendingQuestion(''); setPendingQuestionIsAudio(false); }}
                  pendingQuestionIsAudio={pendingQuestionIsAudio}
                />
              </div>
            )}

            {/* Tab: Notes */}
            {rightPanelTab === 'notes' && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">Notes personnelles</h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Vos notes pour <strong className="text-slate-600">{currentRef.lesson.title}</strong> — sauvegardées automatiquement
                  </p>
                </div>
                <div className="flex-1 px-4 pb-4 overflow-hidden">
                  <textarea
                    value={noteContent}
                    onChange={(e) => saveNote(e.target.value)}
                    placeholder={`Ex : "${currentRef.lesson.bullets[0] ?? 'Points importants à retenir...'}" → à revoir avant l'examen`}
                    className="w-full h-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-300 focus:bg-white transition-colors leading-relaxed"
                  />
                </div>
                {/* Notes tips */}
                <div className="shrink-0 border-t border-slate-100 px-4 py-3 bg-slate-50/40">
                  <p className="text-[10px] text-slate-400 font-medium mb-1.5">💡 Conseils de prise de notes</p>
                  <div className="space-y-1">
                    {[
                      'Résumez avec vos propres mots',
                      'Notez les points difficiles',
                      'Ajoutez des exemples concrets',
                    ].map((tip) => (
                      <p key={tip} className="text-[10px] text-slate-500 flex items-start gap-1.5">
                        <span className="text-violet-400 shrink-0">→</span>{tip}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Ressources */}
            {rightPanelTab === 'resources' && (
              <div className="flex-1 overflow-y-auto">
                {/* Resources */}
                <div className="px-4 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    Ressources utiles
                  </h3>
                  <div className="space-y-2">
                    {lessonResources.map((r) => (
                      <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 hover:border-violet-200 hover:bg-violet-50/30 transition-colors cursor-pointer group">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-100 shadow-sm">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{r.title}</p>
                          <p className="text-[10px] text-slate-400">{r.type} · {r.duration}</p>
                        </div>
                        <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQ */}
                <div className="px-4 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    Questions fréquentes
                  </h3>
                  <div className="space-y-1.5">
                    {lessonFaqs.map((faq) => (
                      <button
                        key={faq.id}
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-left hover:border-violet-200 hover:bg-violet-50/30 transition-colors group"
                      >
                        <p className="text-xs font-medium text-slate-700 leading-snug">{faq.q}</p>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-violet-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progression rapide */}
                <div className="px-4 py-4">
                  <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    Votre progression
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Leçons terminées</span>
                      <span className="font-bold text-slate-800">{completedSet.size} / {allLessons.length}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${lessonProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Temps restant estimé</span>
                      <span className="font-bold text-violet-600">{estimatedCourseTimeLeft}</span>
                    </div>
                    {bookmarkedLessons.size > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <Bookmark className="h-3.5 w-3.5 text-violet-500 fill-current" />
                        <span className="text-xs text-slate-500">{bookmarkedLessons.size} leçon{bookmarkedLessons.size > 1 ? 's' : ''} enregistrée{bookmarkedLessons.size > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM NAVIGATION ══════════════════════════════════════════════ */}
      <footer className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-4 py-3 z-20">
        <div className="max-w-xl mx-auto grid grid-cols-3 items-center gap-3">

          {/* ← Précédent */}
          <div className="flex justify-start">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={currentRef.globalIndex === 0}
              className="gap-1.5 text-slate-500 hover:text-primary font-semibold disabled:opacity-30 h-9 px-3 rounded-xl hover:bg-primary/5 transition-all"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline text-sm">Précédent</span>
            </Button>
          </div>

          {/* Progress dots + counter */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1 max-w-[180px] overflow-x-hidden">
              {allLessons.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentRef(allLessons[i])}
                  title={`Leçon ${i + 1}`}
                  className={cn(
                    'rounded-full transition-all duration-300 shrink-0',
                    i === currentRef.globalIndex
                      ? 'h-2 w-6 bg-primary'
                      : completedSet.has(i)
                      ? 'h-2 w-2 bg-emerald-400 hover:bg-emerald-500'
                      : 'h-2 w-2 bg-slate-200 hover:bg-slate-300',
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
              {currentRef.globalIndex + 1} / {allLessons.length}
            </span>
          </div>

          {/* Suivant → */}
          <div className="flex justify-end">
            <Button
              onClick={goNext}
              className={cn(
                'gap-1.5 font-semibold text-sm h-9 px-3 sm:px-5 rounded-xl shadow-sm transition-all active:scale-95',
                isLast
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20',
              )}
            >
              <span className="hidden sm:inline">{isLast ? '🎉 Terminer' : 'Suivant'}</span>
              <span className="sm:hidden">{isLast ? '🎉' : '→'}</span>
              {!isLast && <ChevronRight className="h-4 w-4 hidden sm:block" />}
            </Button>
          </div>

        </div>
      </footer>

      {/* ═══ HEYGEN AVATAR TEACHER ══════════════════════════════════════════ */}
      <div className="fixed bottom-[160px] right-6 xl:right-[396px] z-[65] flex flex-col items-center">
        <AvatarTeacher
          ref={avatarRef}
          agentState={agentState}
          language={locale as 'fr' | 'en' | 'ar'}
          onReady={() => setAvatarReady(true)}
          onFallback={() => setAvatarReady(false)}
          onSpeakingEnd={handleNarrationEnd}
        />
      </div>

      {/* ═══ AGENT VOICE BAR ════════════════════════════════════════════════ */}
      <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 z-[65] pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className="pointer-events-auto flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-lg shadow-slate-900/8 backdrop-blur-sm"
          >
            {/* State indicator */}
            {agentState === 'loading' && (
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-100">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Préparation…</span>
              </div>
            )}
            {agentState === 'speaking' && (
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-100">
                <div className="flex gap-[3px] items-end h-4">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="w-[3px] bg-emerald-500 rounded-full"
                      style={{
                        animation: 'waveBar 0.7s ease-in-out infinite alternate',
                        animationDelay: `${i * 0.15}s`,
                        height: `${10 + i * 3}px`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-emerald-600 whitespace-nowrap">En cours…</span>
              </div>
            )}
            {agentState === 'paused' && (
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-100">
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 whitespace-nowrap">En pause</span>
              </div>
            )}

            {/* ▶ Démarrer */}
            <button
              onClick={handleStartAutoPlay}
              disabled={agentState !== 'idle'}
              title="Démarrer depuis la 1ère slide"
              className={cn(
                'flex items-center gap-2 h-8 px-4 rounded-xl font-semibold text-sm transition-all',
                agentState !== 'idle'
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-sm shadow-emerald-500/30',
              )}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Démarrer</span>
            </button>

            {/* ⏸ Pause */}
            <button
              onClick={agentPauseNarration}
              disabled={agentState !== 'speaking'}
              title="Mettre la narration en pause"
              className={cn(
                'flex items-center gap-2 h-8 px-3 rounded-xl font-semibold text-sm transition-all',
                agentState !== 'speaking'
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-sm shadow-amber-500/30',
              )}
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>

            {/* ▶ Reprendre */}
            <button
              onClick={agentResumeNarration}
              disabled={agentState !== 'paused'}
              title="Reprendre la narration"
              className={cn(
                'flex items-center gap-2 h-8 px-3 rounded-xl font-semibold text-sm transition-all',
                agentState !== 'paused'
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95 shadow-sm shadow-sky-500/30',
              )}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Reprendre</span>
            </button>

            {/* ■ Arrêter */}
            <button
              onClick={agentStopAll}
              disabled={agentState === 'idle'}
              title="Arrêter et réinitialiser la narration"
              className="flex items-center gap-2 h-8 px-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Arrêter</span>
            </button>

            {/* Voice counter (display-only) */}
            <div className="pl-3 border-l border-slate-100 flex items-center gap-1 text-[11px] font-bold tabular-nums shrink-0 text-slate-300">
              <Mic className="h-3 w-3" />
              <span>{voiceUsed}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══ MODULE QUIZ MODAL ══════════════════════════════════════════════ */}
      <ModuleQuizModal
        isOpen={moduleQuizOpen}
        moduleTitle={moduleQuizSubject}
        moduleIcon={moduleQuizIcon}
        lessonContent={moduleQuizLessonContent}
        courseId={courseId}
        lang="fr"
        userId={quizUserId}
        sessionId={quizSessionId}
        onClose={handleModuleQuizClose}
      />

      {/* ═══ COURSE COMPLETION MODAL ═════════════════════════════════════════ */}
      <AnimatePresence>
        {courseCompletedOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center"
          >
            <motion.div
              initial={{ y: 24, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 24, scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white shadow-2xl overflow-hidden"
            >
              {/* Gradient header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-300" />
                      Cours terminé !
                    </h3>
                    <p className="text-sm text-white/80 mt-0.5">
                      Félicitations, toutes les leçons sont complétées.
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate download highlight */}
              <div className="px-6 py-5">
                <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileDown className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Votre certificat d&apos;accomplissement est prêt</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Téléchargez votre certificat PDF officiel Smartovate / Subul.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold shadow-sm rounded-xl"
                    disabled={certDownloading}
                    onClick={async () => {
                      setCertDownloading(true);
                      try {
                        await downloadCourseCompletionCertificate(courseId);
                      } catch {
                        // silently ignore — user can retry
                      } finally {
                        setCertDownloading(false);
                      }
                    }}
                  >
                    {certDownloading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Génération…</>
                    ) : (
                      <><FileDown className="h-4 w-4" />Télécharger le certificat PDF</>
                    )}
                  </Button>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/${locale}/dashboard/learner/certifications`)}
                    className="flex-1 rounded-xl text-sm"
                  >
                    Mes certifications
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCourseCompletedOpen(false);
                      router.push(`/${locale}/dashboard/learner/cours`);
                    }}
                    className="flex-1 rounded-xl text-sm text-slate-500"
                  >
                    Retour aux cours
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE AI CHAT OVERLAY ═════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileChatOpen && (
          <motion.div
            key="chat-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xl:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileChatOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-xs sm:max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <UniversalTutor
                contextType="course"
                contextTitle={currentRef.lesson.title}
                contextItems={currentRef.lesson.bullets}
                isOpen
                onToggle={() => setMobileChatOpen(false)}
                locale={locale}
                courseId={courseId}
                lessonId={currentRef.lessonId}
                courseTitle={courseData.title}
                lessonTitle={currentRef.lesson.title}
                pendingQuestion={pendingQuestion}
                onPendingQuestionSent={() => { setPendingQuestion(''); setPendingQuestionIsAudio(false); }}
                pendingQuestionIsAudio={pendingQuestionIsAudio}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
