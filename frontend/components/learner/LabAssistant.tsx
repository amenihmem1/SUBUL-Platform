'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, User, Send, Mic, MicOff, ImagePlus, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { getBackendUrl, API_PATHS } from '@/lib/api/client'
import { getToken } from '@/lib/auth/token'
import { cloudTutorSessionEnd } from '@/services/cloud-tutor'
import {
  VOICE_MAX,
  CARTESIA_VOICES,
  readMonthlyVoice,
  writeMonthlyVoice,
  buildCartesiaTtsWebSocketUrl,
} from '@/lib/voice-assistant'

const DEEPGRAM_API_KEY = 'a35f27d320751cd79947fa0541196998df5cb993'
const CARTESIA_API_KEY = 'sk_car_aQJuuV1BBJFZ26Xhbur6Cz'
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  image?: string 
  
}

// ── Locale helpers ──────────────────────────────────────────────────────────
type SupportedLocale = 'fr' | 'en'

const GREETINGS: Record<SupportedLocale, (name: string, title: string) => string> = {
  fr: (name, title) => `Bonjour ! Je suis votre **${name}** pour le lab **${title}**.\n\nPosez vos questions, joignez une **capture d'écran** 🖼️ ou utilisez le **micro** 🎤 pour parler.`,
  en: (name, title) => `Hello! I am your **${name}** for the lab **${title}**.\n\nAsk your questions, attach a **screenshot** 🖼️ or use the **mic** 🎤 to speak.`,
}

const CHIPS: Record<SupportedLocale, [string, string, string]> = {
  fr: ['Explique cette étape', 'Je suis bloqué', 'Vérifier ma config'],
  en: ['Explain this step', 'I\'m stuck', 'Check my config'],
}

const DG_LANG: Record<SupportedLocale, string> = { fr: 'fr', en: 'en-US' }

function resolveLocale(locale?: string): SupportedLocale {
  if (locale === 'en') return 'en'
  return 'fr'
}

interface LabAssistantProps {
  labTitle?: string
  tasks: string[]
  platform: 'aws' | 'azure' | 'default'
  isOpen: boolean
  onToggle: () => void
  className?: string
  /** Active platform locale ('en' | 'fr') — drives greeting, chips, Deepgram & Cartesia language. */
  locale?: string
  /** Pre-filled question to auto-send. Reset by calling onPendingQuestionSent. */
  pendingQuestion?: string
  onPendingQuestionSent?: () => void
  /** When true the auto-sent pendingQuestion response is read aloud via TTS. */
  pendingQuestionIsAudio?: boolean
  /** Optional context identifiers forwarded to the cloud-tutor backend for course-scoped retrieval. */
  courseId?: string
  lessonId?: string
  courseTitle?: string
  lessonTitle?: string
  labSlug?: string
}

const PLATFORM_CONFIG = {
  aws: {
    name: 'Assistant AWS',
    gradient: 'from-orange-500 to-amber-500',
    pill: 'bg-orange-100 text-orange-700 border-orange-200',
    send: 'bg-orange-500 hover:bg-orange-600',
    micActive: 'bg-orange-500 shadow-orange-200',
    dot: 'bg-orange-500',
  },
  azure: {
    name: 'Assistant Azure',
    gradient: 'from-blue-500 to-cyan-500',
    pill: 'bg-blue-100 text-blue-700 border-blue-200',
    send: 'bg-blue-500 hover:bg-blue-600',
    micActive: 'bg-blue-500 shadow-blue-200',
    dot: 'bg-blue-500',
  },
  gcp: {
    name: 'Assistant GCP',
    gradient: 'from-red-500 to-yellow-500',
    pill: 'bg-red-100 text-red-700 border-red-200',
    send: 'bg-red-500 hover:bg-red-600',
    micActive: 'bg-red-500 shadow-red-200',
    dot: 'bg-red-500',
  },
  default: {
    name: 'Assistant Lab',
    gradient: 'from-violet-500 to-purple-600',
    pill: 'bg-violet-100 text-violet-700 border-violet-200',
    send: 'bg-violet-500 hover:bg-violet-600',
    micActive: 'bg-violet-500 shadow-violet-200',
    dot: 'bg-violet-500',
  },
} as const

export default function LabAssistant({
  labTitle,
  tasks,
  platform,
  isOpen,
  onToggle,
  className = '',
  locale: localeProp,
  pendingQuestion,
  onPendingQuestionSent,
  pendingQuestionIsAudio = false,
  courseId,
  lessonId,
  courseTitle,
  lessonTitle,
  labSlug,
}: LabAssistantProps) {
  const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.default
  const lang = resolveLocale(localeProp)

  // ── Chat state ──────────────────────────────────────────────────────────────
  const buildGreeting = (l: SupportedLocale) =>
    GREETINGS[l](cfg.name, labTitle || (l === 'fr' ? 'en cours' : 'in progress'))

  const [messages, setMessages]           = useState<ChatMessage[]>([{ role: 'assistant', content: buildGreeting(lang) }])
  const [input, setInput]                 = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [isRecording, setIsRecording]     = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const [sessionId] = useState(() => 'lab_' + Math.random().toString(36).substr(2, 9))
  const [voiceUsed, setVoiceUsed] = useState<number>(() => readMonthlyVoice())
  // Client-side voice cap removed — backend AgentQuotaService is the only gate now.
  const voiceLimitReached = false
  void VOICE_MAX

  const consumeVoiceCredit = useCallback(() => {
    setVoiceUsed(prev => {
      const next = prev + 1
      writeMonthlyVoice(next)
      return next
    })
  }, [])

  const scrollRefs         = useRef<(HTMLDivElement | null)[]>([])
  const imageInputRef      = useRef<HTMLInputElement>(null)
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null)
  const sttSocketRef       = useRef<WebSocket | null>(null)
  const audioContextRef    = useRef<AudioContext | null>(null)
  const nextPlayTimeRef    = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', content: buildGreeting(lang) }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labTitle, lang])

  useEffect(() => {
    scrollRefs.current.forEach(el => el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }))
  }, [messages, liveTranscript])

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 })
    const sid = sessionId
    return () => {
      abortControllerRef.current?.abort()
      audioContextRef.current?.close()
      sttSocketRef.current?.close()
      cloudTutorSessionEnd(sid)
    }
  }, [])

  // Auto-send a pre-filled question (e.g. from "Expliquer ce concept" button)
  useEffect(() => {
    if (!pendingQuestion?.trim()) return
    sendMessage(pendingQuestion, pendingQuestionIsAudio)
    onPendingQuestionSent?.()
  // sendMessage is stable (doesn't change between renders)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion])

  const playAudioChunk = (arrayBuffer: ArrayBuffer) => {
    const ctx = audioContextRef.current
    if (!ctx) return
    const float32Array = new Float32Array(arrayBuffer)
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 44100)
    audioBuffer.getChannelData(0).set(float32Array)
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    const now = ctx.currentTime
    if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now
    source.start(nextPlayTimeRef.current)
    nextPlayTimeRef.current += audioBuffer.duration
  }

  const interruptAssistant = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
  }
  
  const sendMessage = async (text: string, isAudio = false) => {
    const hasImage = !!selectedImage
    if (!text.trim() && !hasImage) return
    if (isLoading) return

    interruptAssistant()

    const imageToSend  = selectedImage
    const ctxTasks     = tasks.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')

    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      ...(imageToSend ? { image: imageToSend } : {}),
    }])
    setInput('')
    setSelectedImage(null)
    setIsLoading(true)

    abortControllerRef.current = new AbortController()

    try {
      if (isAudio && audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      let ttsWs: WebSocket | null = null
      const ttsQueue: unknown[] = []
      const contextId = 'ctx-' + Date.now()
      let currentLang: string = lang

      if (isAudio) {
        ttsWs = new WebSocket(buildCartesiaTtsWebSocketUrl(CARTESIA_API_KEY))
        ttsWs.onopen = () => {
          while (ttsQueue.length > 0) ttsWs!.send(JSON.stringify(ttsQueue.shift()))
        }
        ttsWs.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'chunk' && msg.data) {
            const binaryStr = atob(msg.data)
            const bytes = new Uint8Array(binaryStr.length)
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
            playAudioChunk(bytes.buffer)
          } else if (msg.type === 'done') {
            if (ttsWs!.readyState === WebSocket.OPEN) ttsWs!.close()
          }
        }
      }

      const res = await fetch(`${getBackendUrl()}${API_PATHS.cloudTutor('chat')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({
          message: text || (lang === 'en' ? '(screenshot attached)' : "(capture d'écran jointe)"),
          is_audio: isAudio,
          session_id: sessionId,
          language: lang,
          ...(courseId ? { course_id: courseId } : {}),
          ...(lessonId ? { lesson_id: lessonId } : {}),
          ...(courseTitle ? { course_title: courseTitle } : {}),
          ...(lessonTitle ? { lesson_title: lessonTitle } : {}),
          ...(labSlug ? { lab_slug: labSlug } : {}),
          context: `Lab ${platform.toUpperCase()} : ${labTitle || (lang === 'en' ? 'untitled' : 'sans titre')}\n\n${lang === 'en' ? 'Tasks' : 'Tâches'} :\n${ctxTasks}`,
          ...(imageToSend ? { image_base64: imageToSend.split(',')[1] } : {}),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) throw new Error('Erreur serveur')

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullResponse = ''
      let jsonBuffer   = ''

      setIsLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (isAudio && ttsWs) {
            const voiceId = CARTESIA_VOICES[currentLang as 'fr' | 'en' | 'ar'] ?? CARTESIA_VOICES.fr
            const endPayload = {
              context_id: contextId, model_id: 'sonic-3',
              voice: { mode: 'id', id: voiceId },
              transcript: ' ',
              output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: 44100 },
              language: currentLang, continue: false,
            }
            if (ttsWs.readyState === WebSocket.OPEN) ttsWs.send(JSON.stringify(endPayload))
            else ttsQueue.push(endPayload)
          }
          break
        }

        jsonBuffer += decoder.decode(value, { stream: true })
        let boundary = jsonBuffer.indexOf('\n')

        while (boundary !== -1) {
          const line = jsonBuffer.slice(0, boundary)
          jsonBuffer  = jsonBuffer.slice(boundary + 1)
          boundary    = jsonBuffer.indexOf('\n')
          if (!line.trim()) continue

          try {
            const data         = JSON.parse(line)
            const chunk        = data.chunk ?? ''
            const detectedLang = data.lang || 'fr'
            fullResponse      += chunk

            setMessages(prev => {
              const u = [...prev]
              u[u.length - 1] = { role: 'assistant', content: fullResponse }
              return u
            })

            if (isAudio && data.status === 'streaming' && ttsWs) {
              const cleanText = chunk.replace(/[*#_~>|\-`"']/g, '')
              if (cleanText.trim()) {
                currentLang = detectedLang
                const voiceId = CARTESIA_VOICES[currentLang as 'fr' | 'en' | 'ar'] ?? CARTESIA_VOICES.fr
                const payload = {
                  context_id: contextId, model_id: 'sonic-3',
                  voice: { mode: 'id', id: voiceId },
                  transcript: cleanText,
                  output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: 44100 },
                  language: currentLang, continue: true,
                }
                if (ttsWs.readyState === WebSocket.OPEN) ttsWs.send(JSON.stringify(payload))
                else ttsQueue.push(payload)
              }
            }
          } catch { /* skip malformed chunk */ }
        }
      }

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: ' Serveur IA inaccessible. Vérifiez que le backend NestJS est démarré.',
        }])
        setIsLoading(false)
      }
    }
  }
  
  const startRecording = async () => {
    if (voiceLimitReached) return
    interruptAssistant()
    consumeVoiceCredit()
    setLiveTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const apiKey = DEEPGRAM_API_KEY
      const dgLang = DG_LANG[lang] ?? 'fr'
      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-3&language=${dgLang}&smart_format=true&endpointing=100`,
        ['token', apiKey!]
      )
      sttSocketRef.current = socket

      socket.onopen = () => {
        setIsRecording(true)
        const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = rec
        rec.ondataavailable = (ev) => { if (ev.data.size > 0 && socket.readyState === 1) socket.send(ev.data) }
        rec.start(250)
      }

      let acc = ''
      socket.onmessage = (msg) => {
        const r = JSON.parse(msg.data)
        if (r.type === 'Results' && r.channel) {
          const t = r.channel.alternatives[0].transcript
          if (t && r.is_final) { acc += t + ' '; setLiveTranscript(acc) }
          else if (t) setLiveTranscript(acc + t)
        }
      }

      socket.onclose = () => {
        setIsRecording(false)
        if (acc.trim()) sendMessage(acc.trim(), true) 
          
        setLiveTranscript('')
      }
    } catch {
      alert('Micro inaccessible. Vérifiez les permissions du navigateur.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
      if (sttSocketRef.current?.readyState === 1) {
        sttSocketRef.current.send(JSON.stringify({ type: 'CloseStream' }))
      }
    }
  }

  const toggleVoice = () => {
    if (voiceLimitReached) return
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const original = ev.target?.result as string
      // Compress via canvas: max 900px wide, JPEG 0.75
      const img = new Image()
      img.onload = () => {
        const MAX = 900
        const scale = img.width > MAX ? MAX / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setSelectedImage(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = () => setSelectedImage(original) // fallback: use as-is
      img.src = original
    }
    reader.readAsDataURL(file)
  }
  
  const renderChat = (scrollIdx: number, showCloseBtn = false) => (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${cfg.gradient} shrink-0`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{cfg.name}</p>
          <p className="text-xs text-white/70 truncate">{labTitle || 'Lab en cours'}</p>
        </div>
        <div
          title={`${voiceUsed} interactions vocales ce mois`}
          className="hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border shrink-0 mr-2 bg-white/10 border-white/20 text-white/80"
        >
          <Mic className="h-2.5 w-2.5 shrink-0" />
          <span className="tabular-nums">{voiceUsed}</span>
        </div>
        {isLoading && (
          <button onClick={interruptAssistant} title="Interrompre"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {/* Close (mobile only) */}
        {showCloseBtn && !isLoading && (
          <button onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={(el) => { scrollRefs.current[scrollIdx] = el }}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/60"
      >
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} mt-0.5`}>
                <Bot className="h-3 w-3 text-white" />
              </div>
            )}
            <div className={cn(
              'max-w-[82%] rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden',
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
            )}>

              {msg.role === 'user' && msg.image && (
                <img src={msg.image} alt="Capture" className="w-full max-h-40 object-cover" />
              )}

              {msg.role === 'user' ? (
                msg.content && <span className="block px-3 py-2">{msg.content}</span>
              ) : (
                <div className="prose prose-sm max-w-none px-3 py-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 mt-0.5">
                <User className="h-3 w-3 text-indigo-600" />
              </div>
            )}
          </div>
        ))}
        {isRecording && liveTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[82%] rounded-2xl rounded-tr-sm px-3 py-2 bg-primary/80 text-primary-foreground text-sm italic shadow-sm">
              {liveTranscript}<span className="animate-pulse"> …</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient}`}>
              <Bot className="h-3 w-3 text-white" />
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-3 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>
      <div className="px-3 pt-2 pb-1.5 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-wrap gap-1">
          {CHIPS[lang].map((q) => (
            <button key={q} onClick={() => sendMessage(q, false)}
              disabled={isLoading || isRecording}
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full border font-semibold transition-colors disabled:opacity-50',
                cfg.pill
              )}>
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 bg-white shrink-0">
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs text-red-600 font-semibold flex-1">Écoute… cliquez 🎤 pour envoyer</span>
          </div>
        )}
        {selectedImage && (
          <div className="relative mb-2 inline-block">
            <img src={selectedImage} alt="Aperçu" className="h-16 w-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
            <button type="button" onClick={() => setSelectedImage(null)}
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-red-500 transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input.trim(), false) }}>
          <div className="flex gap-1.5 items-center bg-slate-100 rounded-2xl px-3 py-1.5">
            <input
              value={isRecording ? liveTranscript : input}
              onChange={(e) => { if (!isRecording) setInput(e.target.value) }}
              placeholder={isRecording ? '🎤 Parlez maintenant…' : 'Votre question…'}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
            />
            <button type="button" onClick={() => imageInputRef.current?.click()}
              disabled={isLoading || isRecording} title="Joindre une capture d'écran"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all shrink-0',
                selectedImage
                  ? cn(cfg.pill, 'border')
                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300 disabled:opacity-40'
              )}>
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={toggleVoice} disabled={isLoading || voiceLimitReached}
              title={voiceLimitReached ? 'Limite mensuelle atteinte' : isRecording ? 'Envoyer le message vocal' : 'Dicter un message'}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all shrink-0',
                voiceLimitReached ? 'opacity-30 cursor-not-allowed bg-slate-200' :
                isRecording
                  ? 'bg-red-500 text-white shadow-md shadow-red-200 animate-pulse'
                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300 disabled:opacity-40'
              )}>
              {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <button type="submit"
              disabled={isLoading || isRecording || (!input.trim() && !selectedImage)}
              className={cn('flex h-7 w-7 items-center justify-center rounded-xl transition-all shrink-0 text-white disabled:opacity-40', cfg.send)}>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
  
  return (
    <>

      <aside className={cn('w-80 shrink-0 border-l border-slate-200 bg-white hidden xl:flex flex-col', className)}>
        {renderChat(0)}
      </aside>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 xl:hidden"
            onClick={onToggle}
          >
            <motion.aside
              initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {renderChat(1, true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
