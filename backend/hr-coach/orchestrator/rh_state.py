from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


PhaseType = Literal["INTRO", "BEHAVIOR", "SOFT", "MOTIVATION", "FINAL"]


@dataclass
class RHSessionState:
    session_id: str
    interview_max_questions: int = 4
    last_question_index: int = 0
    turns: list[dict[str, Any]] = field(default_factory=list)
    final_report: dict[str, Any] | None = None
    cv_profile: dict[str, Any] = field(default_factory=dict)
    cv_uploaded: bool = False
    response_language: Literal["fr", "en", ""] = ""
    visual_observations: dict[str, Any] = field(default_factory=dict)
    audio_observations: dict[str, Any] = field(default_factory=dict)
    proctoring_events: list[dict[str, Any]] = field(default_factory=list)
    interview_status: Literal["draft", "active", "finalized"] = "draft"
    finalized_at: str = ""
    finalized_by: str = ""
    preferred_input_mode: Literal["text", "voice", "mixed"] = "mixed"
    cached_insights: dict[str, Any] = field(default_factory=dict)
