from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from deepgram import DeepgramClient, DeepgramClientOptions, LiveOptions, LiveTranscriptionEvents
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

try:
    from deepgram.clients.listen.v1.websocket import async_client as deepgram_async_ws_client
except Exception:  # pragma: no cover
    deepgram_async_ws_client = None

from core.config import load_settings
from core.session_store_factory import build_resilient_session_store
from orchestrator.session_store import merge_session_payload
from vision.emotion import CustomEmotionAnalyzer, NoopEmotionAnalyzer, emotion_analysis_to_dict, update_visual_observations
from voice.observations import update_audio_observations
from voice.tts import CartesiaSonicTTS

logger = logging.getLogger(__name__)
_deepgram_live_transport_patched = False
_DEEPGRAM_SILENCE_FRAME = b"\x00\x00" * 320


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_media_tts(settings):
    if not settings.api_key:
        return None
    return CartesiaSonicTTS(
        api_key=settings.api_key,
        model=settings.model,
        voice_id=settings.voice_id,
        language=settings.language,
        gate_event=None,
        mode="tts",
        verbose=False,
    )


def build_media_emotion_analyzer(settings):
    if settings.emotion.provider == "custom" and settings.emotion.custom_model_dir is not None:
        return CustomEmotionAnalyzer(model_dir=settings.emotion.custom_model_dir)
    return NoopEmotionAnalyzer()


class TTSRequest(BaseModel):
    text: str
    language: str = ""


class AudioObservationRequest(BaseModel):
    duration_seconds: float = 0.0
    word_count: int = 0
    filler_count: int = 0
    speech_rate_wpm: float = 0.0
    volume_score: float = 0.0
    silence_ratio: float = 0.0
    pause_count: int = 0
    pitch_hz: float = 0.0
    pitch_variation_hz: float = 0.0
    energy_label: str = ""
    pace_label: str = ""
    hesitation_label: str = ""


class ProctoringEventRequest(BaseModel):
    type: str = ""
    reason: str = ""
    message: str = ""
    details: dict[str, Any] | None = None


class LiveTranscriptAccumulator:
    def __init__(self) -> None:
        self._final_text = ""

    @staticmethod
    def _normalize_token(token: str) -> str:
        return token.strip(" \t\r\n.,;:!?()[]{}\"'").lower()

    @classmethod
    def _merge_text(cls, existing: str, incoming: str) -> str:
        left = " ".join(str(existing or "").split()).strip()
        right = " ".join(str(incoming or "").split()).strip()
        if not left:
            return right
        if not right:
            return left
        left_cmp = left.lower()
        right_cmp = right.lower()
        if right_cmp.startswith(left_cmp):
            return right
        if left_cmp.startswith(right_cmp):
            return left
        left_words = left.split()
        right_words = right.split()
        max_overlap = min(len(left_words), len(right_words))
        for overlap in range(max_overlap, 0, -1):
            left_tail = [cls._normalize_token(token) for token in left_words[-overlap:]]
            right_head = [cls._normalize_token(token) for token in right_words[:overlap]]
            if left_tail == right_head and any(left_tail):
                return " ".join([*left_words, *right_words[overlap:]]).strip()
        return f"{left} {right}".strip()

    def add_result(self, *, transcript: str, is_final: bool, speech_final: bool) -> list[dict[str, Any]]:
        clean = (transcript or "").strip()
        if not clean:
            return []
        if is_final:
            self._final_text = self._merge_text(self._final_text, clean)
            combined = self._final_text
            if not combined:
                return []
            if speech_final:
                self._final_text = ""
                return [{"type": "final", "text": combined}]
            return [{"type": "interim", "text": combined}]
        combined = self._merge_text(self._final_text, clean)
        return [{"type": "interim", "text": combined}] if combined else []

    def flush(self) -> str:
        combined = self._final_text.strip()
        self._final_text = ""
        return combined


def _configure_deepgram_live_transport() -> None:
    global _deepgram_live_transport_patched
    if _deepgram_live_transport_patched or deepgram_async_ws_client is None:
        return
    deepgram_async_ws_client.PING_INTERVAL = None
    _deepgram_live_transport_patched = True


def _format_live_stt_error(error: Any) -> str:
    description = str(getattr(error, "description", "") or "").strip()
    message = str(getattr(error, "message", "") or "").strip()
    fallback = str(error or "").strip()
    combined = ". ".join(part for part in [description, message] if part)
    normalized = (combined or fallback).lower()
    if "keepalive ping timeout" in normalized:
        return "Deepgram live stream timed out. Please retry the microphone."
    if "did not receive audio data or a text message within the timeout window" in normalized or "net0001" in normalized:
        return "Deepgram live stream went idle for too long. Please keep speaking or retry the microphone."
    return combined or fallback or "Live STT unavailable."


def _is_recoverable_live_stt_error(error: Any) -> bool:
    description = str(getattr(error, "description", "") or "").strip().lower()
    message = str(getattr(error, "message", "") or "").strip().lower()
    fallback = str(error or "").strip().lower()
    normalized = " ".join(part for part in [description, message, fallback] if part)
    return any(
        marker in normalized
        for marker in (
            "keepalive ping timeout",
            "did not receive audio data or a text message within the timeout window",
            "net0001",
        )
    )


def _normalize_stt_language(value: str | None, default: str = "fr") -> str:
    raw = str(value or "").strip().lower()
    if raw in {"fr", "en", "multi"}:
        return raw
    fallback = str(default or "").strip().lower()
    return fallback if fallback in {"fr", "en", "multi"} else "fr"


def build_media_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title="SUBUL RH Media Service", version="0.1.0")
    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    session_store = build_resilient_session_store(settings.database_url, service_name="Media")
    tts_engine = build_media_tts(settings.cartesia)
    emotion_analyzer = build_media_emotion_analyzer(settings)
    vision_analyzers = [emotion_analyzer] if emotion_analyzer.provider != "none" else []
    interview_service_url = os.getenv("INTERVIEW_SERVICE_URL", "https://rh-interview-service.azurewebsites.net").rstrip("/")
    session_cache: dict[str, dict[str, Any]] = {}

    def load_session_payload(session_id: str) -> dict[str, Any]:
        cached = session_cache.get(session_id)
        if isinstance(cached, dict):
            return cached
        try:
            loaded = session_store.load(session_id)
            if isinstance(loaded, dict):
                session_cache[session_id] = loaded
                return loaded
        except OSError as exc:
            logger.warning("Media local session load skipped session=%s error=%s", session_id, exc)
        return {"session_id": session_id}

    def save_session_patch(session_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        existing = session_cache.get(session_id) or {}
        payload = merge_session_payload(existing, {"session_id": session_id, **patch})
        session_cache[session_id] = payload
        if len(session_cache) > 120:
            for stale_session_id in list(session_cache)[:20]:
                session_cache.pop(stale_session_id, None)
        try:
            session_store.save(session_id, payload)
        except OSError as exc:
            logger.warning("Media local session save skipped session=%s error=%s", session_id, exc)
        return payload

    def sync_interview_observations(session_id: str, patch: dict[str, Any]) -> None:
        if not interview_service_url:
            return
        try:
            with httpx.Client(timeout=5.0, trust_env=False) as client:
                response = client.post(
                    f"{interview_service_url}/rh/internal/sessions/{session_id}/observations",
                    json=patch,
                )
                response.raise_for_status()
        except Exception as exc:
            logger.warning("Media observation sync skipped session=%s error=%s", session_id, exc)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "media"}

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "SUBUL RH Media Service", "status": "ok"}

    @app.get("/rh/vision/config")
    def get_vision_config() -> dict[str, Any]:
        emotion = emotion_analyzer.describe()
        return {
            "frontend_live_analysis": {
                "provider": "mediapipe",
                "ready": True,
                "summary": "MediaPipe Face Landmarker is the active live candidate analysis layer in the browser.",
            },
            "backend_emotion_analysis": {
                "provider": emotion.provider,
                "ready": emotion.ready,
                "summary": emotion.summary,
                "metadata": emotion.metadata or {},
            },
        }

    @app.post("/rh/sessions/{session_id}/vision")
    async def analyze_candidate_vision(
        session_id: str,
        file: UploadFile = File(...),
        face_detected: bool = Form(False),
        centered: bool = Form(False),
        looking_forward: bool = Form(False),
        expression: str = Form(""),
        posture: str = Form(""),
        face_count: int = Form(0),
        objects: str = Form(""),
        face_box_left: float | None = Form(None),
        face_box_top: float | None = Form(None),
        face_box_right: float | None = Form(None),
        face_box_bottom: float | None = Form(None),
    ) -> dict[str, Any]:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Image frame is empty.")
        face_box = None
        if all(value is not None for value in (face_box_left, face_box_top, face_box_right, face_box_bottom)):
            face_box = {"left": face_box_left, "top": face_box_top, "right": face_box_right, "bottom": face_box_bottom}
        mediapipe_payload: dict[str, Any] = {
            "face_detected": face_detected,
            "centered": centered,
            "looking_forward": looking_forward,
            "expression": expression,
            "posture": posture,
            "face_count": face_count,
            "face_box": face_box,
        }
        if objects:
            try:
                parsed_objects = json.loads(objects)
                mediapipe_payload["objects"] = parsed_objects if isinstance(parsed_objects, list) else []
            except Exception:
                mediapipe_payload["objects"] = []
        provider_results = [analyzer.analyze_image_bytes(raw, frame_hint=mediapipe_payload) for analyzer in vision_analyzers]
        session = load_session_payload(session_id)
        visual_observations = update_visual_observations(
            session.get("visual_observations") if isinstance(session.get("visual_observations"), dict) else {},
            mediapipe=mediapipe_payload,
            provider_results=provider_results,
        )
        sync_patch = {"visual_observations": visual_observations, "cached_insights": {}}
        save_session_patch(session_id, sync_patch)
        await asyncio.to_thread(sync_interview_observations, session_id, sync_patch)
        return {
            "status": "ok",
            "session_id": session_id,
            "mediapipe": mediapipe_payload,
            "providers": [emotion_analysis_to_dict(result) for result in provider_results],
            "visual_observations": visual_observations,
        }

    @app.post("/rh/sessions/{session_id}/audio")
    def record_candidate_audio_observations(session_id: str, payload: AudioObservationRequest) -> dict[str, Any]:
        session = load_session_payload(session_id)
        audio_observations = update_audio_observations(
            session.get("audio_observations") if isinstance(session.get("audio_observations"), dict) else {},
            payload.model_dump(),
        )
        sync_patch = {"audio_observations": audio_observations, "cached_insights": {}}
        save_session_patch(session_id, sync_patch)
        sync_interview_observations(session_id, sync_patch)
        return {"status": "ok", "session_id": session_id, "audio_observations": audio_observations}

    @app.post("/rh/sessions/{session_id}/proctoring")
    def record_candidate_proctoring_event(session_id: str, payload: ProctoringEventRequest) -> dict[str, Any]:
        session = load_session_payload(session_id)
        existing_events = session.get("proctoring_events") if isinstance(session.get("proctoring_events"), list) else []
        clean_event = {
            "time": utc_now_iso(),
            "type": str(payload.type or "").strip()[:80],
            "reason": str(payload.reason or payload.type or "Alerte surveillance").strip()[:120],
            "message": str(payload.message or payload.reason or payload.type or "Alerte surveillance").strip()[:240],
            "details": payload.details or {},
        }
        proctoring_events = [*existing_events, clean_event][-500:]
        sync_patch = {"proctoring_events": proctoring_events}
        save_session_patch(session_id, sync_patch)
        sync_interview_observations(session_id, sync_patch)
        return {
            "status": "ok",
            "session_id": session_id,
            "proctoring_events": proctoring_events,
            "proctoring_alerts_count": len(proctoring_events),
            "latest": clean_event,
        }

    @app.post("/rh/stt")
    async def speech_to_text(file: UploadFile = File(...), language: str | None = None) -> dict[str, Any]:
        if not settings.stt.api_key:
            raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY manquant sur le serveur.")
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Fichier audio vide.")
        content_type = (file.content_type or "audio/webm").strip()
        resolved_language = (language or settings.stt.language).strip()
        url = (
            f"https://api.deepgram.com/v1/listen?model={settings.stt.model}"
            f"&language={resolved_language}&smart_format=true&punctuate=true"
        )
        headers = {"Authorization": f"Token {settings.stt.api_key}", "Content-Type": content_type}
        timeout = httpx.Timeout(
            settings.stt.request_timeout_s,
            connect=settings.stt.connect_timeout_s,
            read=settings.stt.read_timeout_s,
            write=settings.stt.write_timeout_s,
        )
        try:
            last_timeout_exc: httpx.TimeoutException | None = None
            resp: httpx.Response | None = None
            max_attempts = max(1, int(settings.stt.max_attempts or 1))
            for attempt in range(1, max_attempts + 1):
                try:
                    async with httpx.AsyncClient(timeout=timeout) as client:
                        resp = await client.post(url, headers=headers, content=raw)
                except httpx.TimeoutException as exc:
                    last_timeout_exc = exc
                    if attempt >= max_attempts:
                        raise
                    if settings.stt.retry_backoff_s > 0:
                        await asyncio.sleep(float(settings.stt.retry_backoff_s) * attempt)
                    continue
                if resp.status_code != 408 or attempt >= max_attempts:
                    break
                if settings.stt.retry_backoff_s > 0:
                    await asyncio.sleep(float(settings.stt.retry_backoff_s) * attempt)
            if resp is None:
                if last_timeout_exc is not None:
                    raise last_timeout_exc
                raise HTTPException(status_code=502, detail="STT request did not produce a response.")
            if resp.status_code >= 400:
                raw_error = resp.text[:240]
                lowered_error = raw_error.lower()
                if "corrupt or unsupported data" in lowered_error:
                    detail = (
                        "Audio invalide ou format non supporte pour la transcription."
                        if resolved_language.lower().startswith("fr")
                        else "Invalid audio or unsupported format for transcription."
                    )
                    raise HTTPException(status_code=502, detail=detail)
                if resp.status_code == 408:
                    detail = (
                        "Le service de transcription a expire avant de recevoir un audio complet. Reessayez avec un enregistrement plus court."
                        if resolved_language.lower().startswith("fr")
                        else "The transcription service timed out before receiving a complete audio payload. Retry with a shorter recording."
                    )
                    raise HTTPException(status_code=504, detail=detail)
                raise HTTPException(status_code=502, detail=f"Deepgram error {resp.status_code}: {raw_error}")
            data = resp.json()
            transcript = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("transcript", "")
            return {"text": (transcript or "").strip()}
        except HTTPException:
            raise
        except httpx.TimeoutException as exc:
            raise HTTPException(status_code=504, detail="Le service de transcription a mis trop de temps a repondre.") from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"STT backend failed: {exc}") from exc

    @app.post("/rh/tts")
    def text_to_speech(payload: TTSRequest):
        start = time.perf_counter()
        text = (payload.text or "").strip()
        language = (payload.language or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Texte vide pour TTS.")
        if tts_engine is None:
            raise HTTPException(status_code=500, detail="CARTESIA_API_KEY manquant sur le serveur.")
        try:
            audio = tts_engine.synthesize_bytes(text, language=language or None)
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:240] if exc.response is not None else str(exc)
            raise HTTPException(status_code=502, detail=f"Cartesia error: {detail}") from exc
        except httpx.TransportError as exc:
            raise HTTPException(status_code=502, detail=f"Cartesia transport error: {exc}.") from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"TTS backend failed: {exc}") from exc
        logger.info("API /rh/tts total_ms=%.1f text_len=%d", (time.perf_counter() - start) * 1000, len(text))
        return Response(content=audio, media_type="audio/wav")

    @app.websocket("/ws/rh/stt/{session_id}")
    async def rh_live_stt_ws(websocket: WebSocket, session_id: str):
        await websocket.accept()
        _configure_deepgram_live_transport()
        if not settings.stt.api_key:
            await websocket.send_json({"type": "error", "detail": "DEEPGRAM_API_KEY manquant sur le serveur."})
            await websocket.close(code=1011)
            return

        resolved_language = _normalize_stt_language(websocket.query_params.get("language"), settings.stt.language)
        accumulator = LiveTranscriptAccumulator()
        deepgram = DeepgramClient(
            settings.stt.api_key,
            DeepgramClientOptions(api_key=settings.stt.api_key, options={"keepalive": "true"}),
        )
        connection: Any | None = None
        keepalive_task: asyncio.Task[None] | None = None
        pending_flush_task: asyncio.Task[None] | None = None
        last_deepgram_activity_at = time.monotonic()
        deepgram_ready = False
        ready_sent = False

        async def _safe_send(payload: dict[str, Any]) -> None:
            try:
                await websocket.send_json(payload)
            except Exception:
                return

        async def _finish_deepgram_connection() -> None:
            nonlocal connection, deepgram_ready
            current = connection
            connection = None
            deepgram_ready = False
            if current is not None:
                try:
                    await current.finish()
                except Exception:
                    pass

        async def _on_open(_conn, _open=None, **_kwargs):
            return

        async def _flush_pending_final() -> None:
            text = accumulator.flush()
            if text:
                await _safe_send({"type": "final", "text": text})

        def _cancel_pending_flush() -> None:
            nonlocal pending_flush_task
            if pending_flush_task is not None:
                pending_flush_task.cancel()
                pending_flush_task = None

        def _schedule_pending_flush(delay_s: float = 1.4) -> None:
            nonlocal pending_flush_task
            _cancel_pending_flush()

            async def _delayed_flush() -> None:
                try:
                    await asyncio.sleep(delay_s)
                    await _flush_pending_final()
                except asyncio.CancelledError:
                    return

            pending_flush_task = asyncio.create_task(_delayed_flush())

        async def _on_transcript(_conn, result=None, **_kwargs):
            if result is None:
                return
            try:
                alternatives = getattr(getattr(result, "channel", None), "alternatives", []) or []
                if not alternatives:
                    return
                transcript = str(getattr(alternatives[0], "transcript", "") or "").strip()
                payloads = accumulator.add_result(
                    transcript=transcript,
                    is_final=bool(getattr(result, "is_final", False)),
                    speech_final=bool(getattr(result, "speech_final", False)),
                )
                for payload in payloads:
                    if payload.get("type") == "final":
                        _cancel_pending_flush()
                    await _safe_send(payload)
                if bool(getattr(result, "is_final", False)) and not bool(getattr(result, "speech_final", False)):
                    _schedule_pending_flush()
                if bool(getattr(result, "speech_final", False)):
                    _cancel_pending_flush()
                    await _flush_pending_final()
            except Exception as exc:
                logger.warning("Live STT transcript handler failed for session %s: %s", session_id, exc)

        async def _on_utterance_end(_conn, _utterance_end=None, **_kwargs):
            _cancel_pending_flush()
            await _flush_pending_final()

        async def _on_error(_conn, error=None, **_kwargs):
            logger.warning("Deepgram live STT error for session %s: %s", session_id, error)
            if not _is_recoverable_live_stt_error(error):
                await _safe_send({"type": "error", "detail": _format_live_stt_error(error)})

        options = LiveOptions(
            model=settings.stt.model,
            language=resolved_language,
            punctuate=True,
            smart_format=True,
            interim_results=True,
            vad_events=True,
            endpointing=settings.stt.endpointing_ms,
            utterance_end_ms=str(max(1000, settings.stt.utterance_end_ms)),
            encoding="linear16",
            channels=1,
            sample_rate=16000,
        )

        async def _start_deepgram_connection(*, emit_ready: bool) -> bool:
            nonlocal connection, last_deepgram_activity_at, deepgram_ready, ready_sent
            client_factory = getattr(deepgram.listen, "asyncwebsocket", None) or deepgram.listen.asynclive
            next_connection = client_factory.v("1")
            next_connection.on(LiveTranscriptionEvents.Open, _on_open)
            next_connection.on(LiveTranscriptionEvents.Transcript, _on_transcript)
            next_connection.on(LiveTranscriptionEvents.UtteranceEnd, _on_utterance_end)
            next_connection.on(LiveTranscriptionEvents.Error, _on_error)
            opened = await next_connection.start(options)
            if not opened:
                return False
            connection = next_connection
            deepgram_ready = True
            last_deepgram_activity_at = time.monotonic()
            if emit_ready and not ready_sent:
                ready_sent = True
                await _safe_send({"type": "ready", "session_id": session_id, "language": resolved_language, "model": settings.stt.model})
            return True

        async def _restart_deepgram_connection(reason: str) -> bool:
            logger.info("Restarting Deepgram live STT for session %s: %s", session_id, reason)
            await _finish_deepgram_connection()
            return await _start_deepgram_connection(emit_ready=False)

        async def _send_to_deepgram(payload: str | bytes, *, allow_restart: bool = True) -> bool:
            nonlocal last_deepgram_activity_at
            if connection is None or not deepgram_ready:
                if not allow_restart or not await _restart_deepgram_connection("connection-not-ready"):
                    return False
            sent = await connection.send(payload)
            if sent:
                last_deepgram_activity_at = time.monotonic()
                return True
            if allow_restart and await _restart_deepgram_connection("send-failed"):
                return await _send_to_deepgram(payload, allow_restart=False)
            return False

        async def _deepgram_keepalive_loop() -> None:
            while True:
                await asyncio.sleep(1.0)
                try:
                    if time.monotonic() - last_deepgram_activity_at < 1.5:
                        continue
                    if connection is None or not deepgram_ready:
                        await _restart_deepgram_connection("keepalive-connection-not-ready")
                        continue
                    if await _send_to_deepgram(_DEEPGRAM_SILENCE_FRAME, allow_restart=False):
                        last_deepgram_activity_at = time.monotonic()
                        continue
                    if not await _restart_deepgram_connection("keepalive-failed"):
                        return
                except Exception:
                    if not await _restart_deepgram_connection("keepalive-exception"):
                        return

        try:
            if not await _start_deepgram_connection(emit_ready=True):
                await _safe_send({"type": "error", "detail": "Unable to start Deepgram live STT."})
                await websocket.close(code=1011)
                return
            keepalive_task = asyncio.create_task(_deepgram_keepalive_loop())
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                raw_audio = message.get("bytes")
                if raw_audio:
                    if not await _send_to_deepgram(raw_audio):
                        await _safe_send({"type": "error", "detail": "Live STT stream disconnected."})
                        break
                    continue
                if str(message.get("text") or "").strip().lower() == "ping":
                    await _safe_send({"type": "pong"})
        except WebSocketDisconnect:
            pass
        except Exception as exc:
            logger.exception("Live STT websocket failed for session %s", session_id)
            await _safe_send({"type": "error", "detail": f"Live STT backend failed: {exc}"})
        finally:
            _cancel_pending_flush()
            if keepalive_task is not None:
                keepalive_task.cancel()
                try:
                    await keepalive_task
                except asyncio.CancelledError:
                    pass
            try:
                await _flush_pending_final()
            except Exception:
                pass
            await _finish_deepgram_connection()

    return app
