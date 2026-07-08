from __future__ import annotations

import logging
import threading

from core.azure_storage import AzureBlobStorage
from core.config import AppSettings, CartesiaSettings, LLMSettings, STTSettings
from core.paths import ensure_data_dirs
from interview_ai.base import Intelligence
from interview_ai.cv import AzureSearchCVRAGStore, CVRAGStore
from interview_ai.langchain_provider import LangChainIntelligence
from orchestrator.langgraph_orchestrator import LangGraphRHOrchestrator
from orchestrator.rh_workflow_support import RHWorkflowSupport
from orchestrator.session_store import JsonSessionStore, PostgresSessionStore, SessionStore
from vision.emotion import CustomEmotionAnalyzer, NoopEmotionAnalyzer
from voice.stt import DeepgramNovaSTT
from voice.tts import CartesiaSonicTTS

SUPPORTED_LLM_BACKENDS = {"langchain"}
logger = logging.getLogger(__name__)


class SilentTTS:
    """No-op TTS for API mode (text only)."""

    def speak(self, text: str) -> None:
        return None


def build_intelligence(app_settings: AppSettings) -> Intelligence:
    backend = (app_settings.llm_backend or "langchain").strip().lower()
    if backend not in SUPPORTED_LLM_BACKENDS:
        supported = ", ".join(sorted(SUPPORTED_LLM_BACKENDS))
        raise ValueError(f"Unsupported LLM_BACKEND '{backend}'. Supported values: {supported}.")

    settings: LLMSettings = app_settings.llm
    return LangChainIntelligence(
        api_key=settings.api_key,
        base_url=settings.base_url,
        model=settings.model,
        max_tokens=settings.max_tokens,
        temperature=settings.temperature,
        api_version=settings.api_version,
        provider=settings.provider,
    )


def build_session_store(database_url: str) -> SessionStore:
    ensure_data_dirs()
    if database_url:
        return PostgresSessionStore(database_url)
    return JsonSessionStore()


def build_api_tts(settings: CartesiaSettings) -> CartesiaSonicTTS | None:
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


def build_local_tts(settings: CartesiaSettings, gate_event: threading.Event) -> CartesiaSonicTTS:
    return CartesiaSonicTTS(
        api_key=settings.api_key,
        model=settings.model,
        voice_id=settings.voice_id,
        language=settings.language,
        gate_event=gate_event,
        mode=settings.mode,
        verbose=settings.verbose,
    )


def build_emotion_analyzer(app_settings: AppSettings):
    provider = app_settings.emotion.provider
    if provider == "custom" and app_settings.emotion.custom_model_dir is not None:
        return CustomEmotionAnalyzer(model_dir=app_settings.emotion.custom_model_dir)
    return NoopEmotionAnalyzer()


def build_cv_rag_store(app_settings: AppSettings) -> CVRAGStore:
    settings = app_settings.azure_search
    if settings.enabled and settings.endpoint and settings.api_key and settings.index:
        return AzureSearchCVRAGStore(
            endpoint=settings.endpoint,
            api_key=settings.api_key,
            index_name=settings.index,
            api_version=settings.api_version,
        )
    return CVRAGStore()


def build_azure_blob_storage_for_container(app_settings: AppSettings, container: str) -> AzureBlobStorage | None:
    settings = app_settings.azure_storage
    if not settings.enabled:
        return None
    if not settings.connection_string and not (settings.account_name and settings.account_key):
        return None
    try:
        return AzureBlobStorage(
            connection_string=settings.connection_string,
            account_name=settings.account_name,
            account_key=settings.account_key,
            container=container,
        )
    except ValueError as exc:
        logger.warning("Azure Storage disabled: %s", exc)
        return None


def build_azure_blob_storage(app_settings: AppSettings) -> AzureBlobStorage | None:
    return build_azure_blob_storage_for_container(app_settings, app_settings.azure_storage.cv_container)


def build_orchestrator(
    *,
    app_settings: AppSettings,
    tts,
    session_store: SessionStore | None = None,
    intelligence: Intelligence | None = None,
) -> RHWorkflowSupport:
    resolved_store = session_store or build_session_store(app_settings.database_url)
    resolved_intelligence = intelligence or build_intelligence(app_settings)
    return LangGraphRHOrchestrator(
        intelligence=resolved_intelligence,
        tts=tts,
        session_store=resolved_store,
        cv_rag_store=build_cv_rag_store(app_settings),
        cv_blob_storage=build_azure_blob_storage(app_settings),
    )


def build_stt(
    settings: STTSettings,
    orchestrator: RHWorkflowSupport,
    session_id: str,
    gate_event: threading.Event,
) -> DeepgramNovaSTT:
    return DeepgramNovaSTT(
        api_key=settings.api_key,
        orchestrator=orchestrator,
        language=settings.language,
        model=settings.model,
        gate_event=gate_event,
        session_id=session_id,
        mic_index=settings.mic_index,
        endpointing_ms=settings.endpointing_ms,
        utterance_end_ms=settings.utterance_end_ms,
        merge_window_s=settings.merge_window_s,
        continuation_window_s=settings.continuation_window_s,
    )
