"""Subul Cloud Coach API — FastAPI entry (Cartesia TTS, streaming chat)."""
import asyncio
import json
import os
import re
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langdetect import detect
from pydantic import BaseModel

_AGENTS_DIR = Path(__file__).resolve().parent.parent
if str(_AGENTS_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENTS_DIR))

from shared.logging import get_logger
from shared.metrics import AgentMetrics as _AgentMetrics, add_metrics_endpoint
_metrics = _AgentMetrics("coach")

from Accompanying_Agent import AccompanyingAgent

logger = get_logger("coach.api")
coach_system = AccompanyingAgent()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Coach API…")
    await coach_system.setup()
    try:
        await coach_system.search_index_manager.search("azure cloud diagnostics")
        logger.info("Azure Search warm-up OK")
    except Exception as e:
        logger.warning("Azure Search warm-up failed: %s", e)
    yield
    logger.info("Coach API shutdown")


app = FastAPI(title="Subul Cloud Coach API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
add_metrics_endpoint(app)


class ChatRequest(BaseModel):
    message: str
    user_id: str = "etudiant_anonyme"
    session_id: str = "session_defaut"
    is_audio: bool = False
    base64_image: Optional[str] = None


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        clean = request.message.strip()
        if len(clean) >= 2:
            lang_code = detect(clean)
            final_lang = "fr" if lang_code == "fr" else "en"
        else:
            final_lang = "fr"
    except Exception:
        final_lang = "fr"

    logger.info(
        "chat user=%s session=%s lang=%s audio=%s",
        request.user_id,
        request.session_id,
        final_lang,
        request.is_audio,
    )
    agent = coach_system.get_agent(lang=final_lang, is_audio=request.is_audio)

    async def generate_response():
        try:
            consigne = (
                "\n\n(Réponds en Français.)"
                if final_lang == "fr"
                else "\n\n(Answer in English.)"
            )
            msg = request.message + consigne
            if not request.is_audio:
                async for chunk in agent.run_stream(
                    message=msg,
                    user_id=request.user_id,
                    session_id=request.session_id,
                    base64_image=request.base64_image,
                ):
                    yield json.dumps(
                        {"chunk": chunk, "status": "streaming", "lang": final_lang}
                    ) + "\n"
                yield json.dumps(
                    {"chunk": "", "status": "completed", "lang": final_lang}
                ) + "\n"
            else:
                full_text = ""
                async for chunk in agent.run_stream(
                    message=msg,
                    user_id=request.user_id,
                    session_id=request.session_id,
                    base64_image=request.base64_image,
                ):
                    full_text += chunk
                for sentence in re.split(r"(?<=[.!?]) +", full_text):
                    s = sentence.strip()
                    if s:
                        yield json.dumps(
                            {"chunk": s, "status": "streaming", "lang": final_lang}
                        ) + "\n"
                        await asyncio.sleep(0.05)
                yield json.dumps(
                    {"chunk": "", "status": "completed", "lang": final_lang}
                ) + "\n"
        except Exception as e:
            logger.exception("chat stream error")
            yield json.dumps({"chunk": f"Erreur: {e}", "status": "error"}) + "\n"

    return StreamingResponse(generate_response(), media_type="application/x-ndjson")


@app.get("/api/tts")
def tts_endpoint(text: str, lang: str = "fr"):
    voice_id = (
        "6ccbfb76-1fc6-48f7-b71d-91ac6298247b"
        if lang == "en"
        else "f786b574-daa5-4673-aa0c-cbe3e8534c02"
    )
    key = os.getenv("CARTESIA_API_KEY")
    if not key:
        raise HTTPException(503, "CARTESIA_API_KEY not configured")
    try:
        r = requests.post(
            "https://api.cartesia.ai/tts/bytes",
            headers={
                "X-API-Key": key,
                "Cartesia-Version": "2025-04-16",
                "Content-Type": "application/json",
            },
            json={
                "model_id": "sonic-3",
                "transcript": text,
                "voice": {"mode": "id", "id": voice_id},
                "output_format": {
                    "container": "wav",
                    "encoding": "pcm_f32le",
                    "sample_rate": 44100,
                },
                "language": lang,
                "generation_config": {"speed": 1, "volume": 1},
            },
            timeout=120,
        )
        if r.status_code != 200:
            raise HTTPException(500, detail=r.text[:500])
        return Response(content=r.content, media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("TTS error")
        raise HTTPException(500, detail=str(e)) from e


class EndSessionRequest(BaseModel):
    user_id: str
    session_id: str


@app.post("/api/session/end")
async def end_session(request: EndSessionRequest):
    try:
        await coach_system.memory.trigger_background_summary(
            request.user_id, request.session_id
        )
        return {"status": "success"}
    except Exception as e:
        logger.exception("session end")
        raise HTTPException(500, detail=str(e)) from e


@app.get("/api/coach/health")
def health():
    return {"status": "ok", "service": "coach"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
