"""Pydantic schemas for Quiz API."""

from pydantic import BaseModel, Field


class QuizGenerateRequest(BaseModel):
    sujet: str = Field(..., description="Sujet du quiz (ex: 'Azure Blob Storage', 'AWS IAM')")
    nb_questions: int = Field(default=4, ge=2, le=10, description="Nombre de questions (2-10)")
    user_id: str = Field(default="apprenant_anonyme")
    session_id: str = Field(default="session_quiz")
    lang: str = Field(default="fr", description="Langue : 'fr' ou 'en'")
    lesson_content: str | None = Field(
        default=None,
        description="Contenu direct des leçons du module (titres + points clés). "
                    "Quand fourni, remplace la recherche RAG comme contexte du quiz.",
    )


class QuizEvaluateRequest(BaseModel):
    question: dict = Field(..., description="L'objet question complet (issu de /generate)")
    reponse_apprenant: str = Field(..., description="La lettre choisie par l'apprenant (A, B, C ou D)")
    user_id: str = Field(default="apprenant_anonyme")
    session_id: str = Field(default="session_quiz")
    lang: str = Field(default="fr", description="Langue : 'fr' ou 'en'")


class EndSessionRequest(BaseModel):
    user_id: str
    session_id: str
