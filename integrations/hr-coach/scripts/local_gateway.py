from __future__ import annotations

import os

import httpx
import websockets
from fastapi import FastAPI, Request, Response, WebSocket
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect


INTERVIEW_SERVICE_URL = os.getenv("INTERVIEW_SERVICE_URL", "http://127.0.0.1:8011").rstrip("/")
CALENDAR_SERVICE_URL = os.getenv("CALENDAR_SERVICE_URL", "http://127.0.0.1:8012").rstrip("/")
ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://127.0.0.1:8013").rstrip("/")
MEDIA_SERVICE_URL = os.getenv("MEDIA_SERVICE_URL", "http://127.0.0.1:8014").rstrip("/")
REPORTING_SERVICE_URL = os.getenv("REPORTING_SERVICE_URL", "http://127.0.0.1:8015").rstrip("/")

app = FastAPI(title="SUBUL RH Local Gateway", version="0.1.0")


def service_url_for_path(path: str) -> str:
    if path.startswith("/rh/interviews"):
        return CALENDAR_SERVICE_URL
    if path.startswith("/rh/dashboard"):
        return ANALYTICS_SERVICE_URL
    if path.startswith("/rh/stt") or path.startswith("/rh/tts") or path.startswith("/rh/vision/config"):
        return MEDIA_SERVICE_URL
    if path.startswith("/rh/sessions/"):
        tail = path.rsplit("/", 1)[-1]
        if tail in {"vision", "audio", "proctoring"}:
            return MEDIA_SERVICE_URL
        if tail in {"report.pdf", "insights-report.pdf"}:
            return REPORTING_SERVICE_URL
    return INTERVIEW_SERVICE_URL


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "local-gateway"}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(path: str, request: Request) -> Response:
    target_path = "/" + path
    normalized_path = target_path.rstrip("/") or "/"
    target_url = f"{service_url_for_path(normalized_path)}{normalized_path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)

    async with httpx.AsyncClient(timeout=300.0, follow_redirects=False) as client:
        try:
            upstream = await client.request(
                request.method,
                target_url,
                content=await request.body(),
                headers=headers,
            )
        except httpx.HTTPError as exc:
            return JSONResponse({"error": str(exc), "target": target_url}, status_code=502)

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in {"content-encoding", "transfer-encoding", "connection"}
    }
    return Response(upstream.content, status_code=upstream.status_code, headers=response_headers)


@app.websocket("/ws/rh/stt/{session_id}")
async def proxy_stt_websocket(websocket: WebSocket, session_id: str) -> None:
    await proxy_websocket(websocket, f"{MEDIA_SERVICE_URL}/ws/rh/stt/{session_id}")


@app.websocket("/ws/rh/{session_id}")
async def proxy_interview_websocket(websocket: WebSocket, session_id: str) -> None:
    await proxy_websocket(websocket, f"{INTERVIEW_SERVICE_URL}/ws/rh/{session_id}")


async def proxy_websocket(websocket: WebSocket, target_url: str) -> None:
    await websocket.accept()
    ws_url = target_url.replace("http://", "ws://").replace("https://", "wss://", 1)
    try:
        async with websockets.connect(ws_url) as upstream:
            while True:
                message = await websocket.receive()
                if "text" in message:
                    await upstream.send(message["text"])
                    await websocket.send_text(await upstream.recv())
                elif "bytes" in message:
                    await upstream.send(message["bytes"])
                    response = await upstream.recv()
                    if isinstance(response, bytes):
                        await websocket.send_bytes(response)
                    else:
                        await websocket.send_text(response)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close(code=1011)
