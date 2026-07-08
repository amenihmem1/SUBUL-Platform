from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

Phase = Literal["INTRO", "BEHAVIOR", "SOFT", "MOTIVATION", "FINAL"]


class SkillEvidence(BaseModel):
    level: int = Field(ge=0, le=5)
    evidence: str = ""


class Skills(BaseModel):
    communication: SkillEvidence
    teamwork: SkillEvidence
    problem_solving: SkillEvidence
    motivation: SkillEvidence


class ScorePartial(BaseModel):
    communication: int = Field(ge=0, le=5)
    teamwork: int = Field(ge=0, le=5)
    problem_solving: int = Field(ge=0, le=5)
    motivation: int = Field(ge=0, le=5)


class FinalReport(BaseModel):
    score_total: int = Field(ge=0, le=100)
    competencies: ScorePartial
    strengths: List[str] = Field(default_factory=list)
    improvement_points: List[str] = Field(default_factory=list)
    dimension_actions: Dict[str, str] = Field(default_factory=dict)
    risks: List[str] = Field(default_factory=list)
    visual_signals: List[str] = Field(default_factory=list)
    visual_flags: List[str] = Field(default_factory=list)
    visual_metrics: Dict[str, Any] = Field(default_factory=dict)
    confidence_note: str = ""
    audio_signals: List[str] = Field(default_factory=list)
    audio_flags: List[str] = Field(default_factory=list)
    audio_metrics: Dict[str, Any] = Field(default_factory=dict)
    audio_confidence_note: str = ""
    recommendations: List[str] = Field(default_factory=list)
    advice: List[str] = Field(default_factory=list)
    summary: str = ""


class RHAgentOutput(BaseModel):
    say: str
    phase: Phase
    question_index: int = Field(ge=1, le=10)
    notes: List[str] = Field(default_factory=list)

    skills: Skills
    score_partial: ScorePartial

    final_report: Optional[FinalReport] = None
