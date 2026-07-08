from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from core.azure_storage import AzureBlobStorage
from core.config import load_settings
from core.session_store_factory import build_resilient_session_store
from reporting.pdf_report import build_candidate_insights_pdf, build_candidate_report_pdf
from vision.emotion import build_visual_llm_context
from voice.observations import build_audio_llm_context


def _with_response_language(payload: dict[str, Any], language: str = "") -> dict[str, Any]:
    requested_language = str(language or "").strip().lower()
    response_language = requested_language if requested_language in {"fr", "en"} else str(
        payload.get("response_language") or "fr"
    ).strip().lower()
    return {**payload, "response_language": response_language or "fr"}


def _with_current_observation_metrics(payload: dict[str, Any], language: str = "") -> dict[str, Any]:
    next_payload = _with_response_language(payload, language)
    report = next_payload.get("final_report") if isinstance(next_payload.get("final_report"), dict) else {}
    if not report:
        return next_payload
    response_language = str(next_payload.get("response_language") or "fr").strip().lower() or "fr"
    visual_context = build_visual_llm_context(
        next_payload.get("visual_observations") if isinstance(next_payload.get("visual_observations"), dict) else {},
        response_language,
    )
    audio_context = build_audio_llm_context(
        next_payload.get("audio_observations") if isinstance(next_payload.get("audio_observations"), dict) else {},
        response_language,
    )
    events = next_payload.get("proctoring_events") if isinstance(next_payload.get("proctoring_events"), list) else []
    next_payload["final_report"] = {
        **report,
        "visual_signals": visual_context.get("signals", []),
        "visual_flags": visual_context.get("heuristic_flags", []),
        "visual_metrics": visual_context.get("metrics", {}),
        "confidence_note": str(visual_context.get("confidence_note", "") or ""),
        "audio_signals": audio_context.get("signals", []),
        "audio_flags": audio_context.get("heuristic_flags", []),
        "audio_metrics": audio_context.get("metrics", {}),
        "audio_confidence_note": str(audio_context.get("confidence_note", "") or ""),
        "proctoring_events": events,
        "proctoring_alerts_count": len(events),
    }
    return next_payload


def build_reporting_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title="SUBUL RH Reporting Service", version="0.1.0")

    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    session_store = build_resilient_session_store(settings.database_url, service_name="Reporting")
    interview_service_url = os.getenv("INTERVIEW_SERVICE_URL", "https://rh-interview-service.azurewebsites.net").rstrip("/")
    reports_blob_storage = None
    storage_settings = settings.azure_storage
    if storage_settings.enabled and (
        storage_settings.connection_string or (storage_settings.account_name and storage_settings.account_key)
    ):
        try:
            reports_blob_storage = AzureBlobStorage(
                connection_string=storage_settings.connection_string,
                account_name=storage_settings.account_name,
                account_key=storage_settings.account_key,
                container=storage_settings.reports_container,
            )
        except ValueError as exc:
            print(f"[ReportingBlob] disabled: {exc}")

    def persist_report_to_blob(session_id: str, pdf_path, suffix: str = "rapport-rh") -> None:
        if reports_blob_storage is None:
            return
        try:
            raw = pdf_path.read_bytes()
            reports_blob_storage.upload_bytes(
                blob_name=f"reports/{session_id}/{suffix}.pdf",
                raw_bytes=raw,
                content_type="application/pdf",
            )
        except Exception as exc:
            print(f"[ReportingBlob] upload skipped session={session_id} report={suffix}: {exc}")

    def load_report_payload(session_id: str, language: str = "") -> dict[str, Any] | None:
        query_params: dict[str, str] = {"include_insights": "1"}
        requested_language = str(language or "").strip().lower()
        if requested_language in {"fr", "en"}:
            query_params["language"] = requested_language

        fallback_payload = session_store.load(session_id)
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.get(
                    f"{interview_service_url}/rh/sessions/{session_id}",
                    params=query_params,
                )
            if response.status_code == 200:
                payload = response.json()
                if isinstance(payload, dict):
                    if not payload.get("final_report") and isinstance(fallback_payload, dict) and fallback_payload.get("final_report"):
                        payload = {
                            **fallback_payload,
                            **payload,
                            "final_report": fallback_payload["final_report"],
                        }
                    return payload
        except Exception:
            pass

        return fallback_payload

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "reporting"}

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "SUBUL RH Reporting Service", "status": "ok"}

    @app.get("/rh/sessions/{session_id}/report.pdf")
    def download_report_pdf(session_id: str):
        payload = load_report_payload(session_id)
        if not payload:
            raise HTTPException(status_code=404, detail="Session introuvable.")
        if not payload.get("final_report"):
            raise HTTPException(status_code=400, detail="Rapport final non disponible.")

        pdf_path = build_candidate_report_pdf(session_id=session_id, payload=_with_current_observation_metrics(payload))
        persist_report_to_blob(session_id, pdf_path, "rapport-rh")
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"{session_id}-rapport-rh.pdf",
        )

    @app.get("/rh/sessions/{session_id}/insights-report.pdf")
    def download_insights_report_pdf(session_id: str, language: str = ""):
        payload = load_report_payload(session_id, language)
        if not payload:
            raise HTTPException(status_code=404, detail="Session introuvable.")
        if not payload.get("final_report"):
            raise HTTPException(status_code=400, detail="Rapport final non disponible.")

        pdf_path = build_candidate_insights_pdf(
            session_id=session_id,
            payload=_with_current_observation_metrics(payload, language),
        )
        persist_report_to_blob(session_id, pdf_path, "insights-visuels-vocaux")
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"{session_id}-insights-visuels-vocaux.pdf",
        )

    return app
