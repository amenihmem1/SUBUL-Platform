"""
roadmap_api_server.py : Serveur FastAPI dédié à l'Agent Roadmap (Port 8002)

Endpoints :
  GET  /api/roadmap/health                → Healthcheck
  GET  /api/roadmap/history/{user_id}     → Historique long terme de l'utilisateur

  ── Phase 1 : Assessment ──────────────────────────────────────────────────
  POST /api/roadmap/assess/message        → Message conversationnel (streaming NDJSON)
  POST /api/roadmap/assess/analyze        → Analyse profil (JSON)

  ── Phase 2 : Test de Niveau ──────────────────────────────────────────────
  POST /api/roadmap/level/questions       → Génère les questions techniques (JSON)
  POST /api/roadmap/level/evaluate        → Évalue les réponses (JSON)

  ── Phase 3 : Roadmap ─────────────────────────────────────────────────────
  POST /api/roadmap/generate              → Génère le roadmap personnalisé (streaming NDJSON)

  ── Fin de session ────────────────────────────────────────────────────────
  POST /api/roadmap/session/end           → Clôture session + bilan Cosmos DB
"""

import os
import sys
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(os.path.dirname(_BASE_DIR))
_AGENTS_DIR = os.path.dirname(_BASE_DIR)

if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)
if _AGENTS_DIR not in sys.path:
    sys.path.insert(0, _AGENTS_DIR)

from shared.metrics import AgentMetrics as _AgentMetrics, add_metrics_endpoint
_metrics = _AgentMetrics("roadmap")

load_dotenv(os.path.join(_BASE_DIR, ".env"))
load_dotenv(os.path.join(_BASE_DIR, ".env.txt"))

from roadmap_agent import RoadmapBrainAgent

# ── Application FastAPI ──────────────────────────────────────────────────────

app = FastAPI(
    title="Subul Roadmap Agent API",
    description=(
        "Agent Roadmap IA personnalisé en 3 phases :\n"
        "1. Assessment conversationnel (détection profil Cloud/Cyber/IA)\n"
        "2. Test de niveau technique (Débutant/Intermédiaire/Expert)\n"
        "3. Génération roadmap certifications (LLM + RAG Azure Search)"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
add_metrics_endpoint(app)

brain = RoadmapBrainAgent()


@app.on_event("startup")
async def startup_event():
    print("🚀 Démarrage du Serveur FastAPI (Roadmap Agent)...")
    await brain.setup()

    print(" Warm-up réseau RAG...")
    try:
        await brain.search_index_manager.search("warmup certifications roadmap")
        print(" Réseau OK (IPv4) !")
    except Exception as e:
        print(f" Warm-up échoué, API continue : {e}")

    print(" Roadmap Agent prêt !")


# ── Modèles Pydantic ─────────────────────────────────────────────────────────

class AssessMessageRequest(BaseModel):
    message: str = Field(..., description="Message de l'apprenant")
    history: list[dict] = Field(
        default=[],
        description="Historique [{role: 'user'|'assistant', content: '...'}]"
    )
    user_id: str = Field(default="user_anonyme")
    session_id: str = Field(default="session_roadmap")
    lang: str = Field(default="fr", description="'fr' ou 'en'")
    # New fields for authentication
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


class AnalyzeProfileRequest(BaseModel):
    history: list[dict] = Field(..., description="Conversation complète d'assessment")
    user_id: str = Field(default="user_anonyme")
    session_id: str = Field(default="session_roadmap")
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


class AssessQuestionsRequest(BaseModel):
    lang: str = Field(default="fr", description="'fr' ou 'en'")
    user_id: str = Field(default="user_anonyme")
    session_id: str = Field(default="session_roadmap")
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


class LevelQuestionsRequest(BaseModel):
    profile: str = Field(default="cloud", description="'cloud' | 'cyber' | 'ai'")
    lang: str = Field(default="fr")
    user_id: str = Field(default="user_anonyme")
    session_id: str = Field(default="session_roadmap")
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


class LevelEvaluateRequest(BaseModel):
    profile: str = Field(default="cloud", description="'cloud' | 'cyber' | 'ai'")
    questions: list[dict] = Field(..., description="Questions issues de /level/questions")
    answers: dict = Field(..., description="{'1': 'B', '2': 'A', ...}")
    user_id: str = Field(default="user_anonyme")
    session_id: str = Field(default="session_roadmap")
    lang: str = Field(default="fr")
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


class RoadmapGenerateRequest(BaseModel):
    profile: str = Field(..., description="'cloud' | 'cyber' | 'ai'")
    niveau: str = Field(..., description="'Débutant' | 'Intermédiaire' | 'Expert'")
    profile_data: dict = Field(..., description="Résultat de /assess/analyze")
    level_data: dict = Field(..., description="Résultat de /level/evaluate")
    user_id: str = Field(default="user_anonyme")
    session_id: str = Field(default="session_roadmap")
    lang: str = Field(default="fr")
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


class EndSessionRequest(BaseModel):
    user_id: str
    session_id: str
    authenticated_user_id: Optional[int] = Field(None, description="Authenticated user ID from database")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/roadmap/health")
async def health():
    return {"status": "ok", "service": "Subul Roadmap Agent API", "port": 8002}


@app.get("/api/roadmap/history/{user_id}")
async def get_user_history(user_id: str):
    """Retourne l'historique long terme de l'utilisateur (profil, niveau, roadmaps passés)."""
    agent = brain.get_roadmap_agent()
    history = await agent.get_user_history(user_id)
    return {"user_id": user_id, "history": history}


# ── Phase 1 : Assessment ─────────────────────────────────────────────────────

@app.post("/api/roadmap/assess/questions")
async def generate_assess_questions(request: AssessQuestionsRequest):
    """
    Phase 1 — Génère 7 questions à choix multiples (A/B/C) pour détecter le profil.

    Réponse : { questions: [{ id, question, options: {A,B,C}, domain_mapping: {A,B,C} }] }
    """
    print(f"📝 [Roadmap] Génération questions assessment | lang={request.lang}")
    agent = brain.get_roadmap_agent()
    try:
        data = await agent.generate_assess_questions(lang=request.lang)
        return data
    except Exception as e:
        print(f"❌ [Roadmap] Erreur génération questions assessment : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur : {e}")


@app.post("/api/roadmap/assess/message")
async def assess_message(request: AssessMessageRequest):
    """
    Phase 1 — Assessment conversationnel (streaming NDJSON).

    Le LLM pose des questions adaptatives pour détecter le profil.
    Chaque événement : { "chunk": str, "status": "streaming"|"completed", "ready": bool }

    Quand "ready" = true dans l'événement "completed" → appeler /assess/analyze.
    """
    print(
        f"💬 [Roadmap] Assessment message | user={request.user_id} "
        f"| turn={len(request.history) // 2 + 1}"
    )

    agent = brain.get_roadmap_agent()

    async def stream():
        async for chunk in agent.assess_message(
            message=request.message,
            history=request.history,
            user_id=request.user_id,
            session_id=request.session_id,
            lang=request.lang,
        ):
            yield chunk

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@app.post("/api/roadmap/assess/analyze")
async def analyze_profile(request: AnalyzeProfileRequest):
    """
    Phase 1 — Analyse la conversation d'assessment et retourne le profil détecté.

    Réponse : { profile, confidence, scores, hybrid, summary_fr, summary_en,
                strengths, recommended_first_certification }
    """
    print(f"🔍 [Roadmap] Analyse profil | user={request.user_id} | {len(request.history)} messages")

    agent = brain.get_roadmap_agent()
    try:
        profile_data = await agent.analyze_profile(
            history=request.history,
            user_id=request.user_id,
            session_id=request.session_id,
        )
        return profile_data
    except Exception as e:
        print(f"❌ [Roadmap] Erreur analyse profil : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur analyse profil : {e}")


# ── Phase 2 : Test de Niveau ─────────────────────────────────────────────────

@app.post("/api/roadmap/level/questions")
async def generate_level_questions(request: LevelQuestionsRequest):
    """
    Phase 2 — Génère 8 questions techniques adaptées au profil détecté.

    Réponse : { profile, niveau_test, questions: [...] }
    """
    print(f"📋 [Roadmap] Génération questions | profil={request.profile} | lang={request.lang}")

    agent = brain.get_roadmap_agent()
    try:
        questions_data = await agent.generate_level_questions(
            profile=request.profile,
            lang=request.lang,
        )
        return questions_data
    except Exception as e:
        print(f"❌ [Roadmap] Erreur génération questions : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur génération questions : {e}")


@app.post("/api/roadmap/level/evaluate")
async def evaluate_level(request: LevelEvaluateRequest):
    """
    Phase 2 — Évalue les réponses au test de niveau.

    Réponse : { niveau, score, analyse, points_forts, points_a_renforcer, questions_detail }
    """
    print(
        f"🎯 [Roadmap] Évaluation niveau | profil={request.profile} "
        f"| user={request.user_id} | {len(request.answers)} réponses"
    )

    agent = brain.get_roadmap_agent()
    try:
        result = await agent.evaluate_level(
            profile=request.profile,
            questions=request.questions,
            answers=request.answers,
            user_id=request.user_id,
            session_id=request.session_id,
            lang=request.lang,
        )
        return result
    except Exception as e:
        print(f"❌ [Roadmap] Erreur évaluation niveau : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur évaluation niveau : {e}")


# ── Phase 3 : Roadmap ─────────────────────────────────────────────────────────

@app.post("/api/roadmap/generate")
async def generate_roadmap(request: RoadmapGenerateRequest):
    """
    Phase 3 — Génère le roadmap de certifications personnalisé (streaming NDJSON).

    Utilise le RAG (Azure Search) pour récupérer les certifications disponibles,
    puis le LLM génère un roadmap complet avec phases, certifications et timeline.

    Chaque événement : { "chunk": str, "status": "streaming"|"completed" }
    Le JSON du roadmap est assemblé côté client depuis les chunks.
    """
    print(
        f"🗺️ [Roadmap] Génération roadmap | profil={request.profile} "
        f"| niveau={request.niveau} | user={request.user_id}"
    )

    agent = brain.get_roadmap_agent()

    async def stream():
        async for chunk in agent.generate_roadmap(
            profile=request.profile,
            niveau=request.niveau,
            profile_data=request.profile_data,
            level_data=request.level_data,
            user_id=request.user_id,
            session_id=request.session_id,
            lang=request.lang,
        ):
            yield chunk

    return StreamingResponse(stream(), media_type="application/x-ndjson")


# ── Fin de session ────────────────────────────────────────────────────────────

@app.post("/api/roadmap/session/end")
async def end_session(request: EndSessionRequest):
    """
    Close session and save educational summary to long-term memory (Cosmos DB).
    WARNING FinOps : Call ONLY when user quits the roadmap flow.
    """
    print(
        f"🚪 [Roadmap] Closing session | user={request.user_id} "
        f"| session={request.session_id}"
    )

    try:
        await brain.memory.trigger_background_summary(request.user_id, request.session_id)
        return {
            "status": "success",
            "message": "Bilan de session roadmap sauvegardé en mémoire longue.",
        }
    except Exception as e:
        print(f"❌ [Roadmap] Erreur clôture session : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la clôture de session.")


# ── Lancement ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=False)