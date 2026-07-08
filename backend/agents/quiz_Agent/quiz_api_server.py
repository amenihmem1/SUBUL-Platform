"""
quiz_api_server.py : Serveur FastAPI dédié à l'Agent Quiz (Port 8001)

Endpoints :
  GET  /api/quiz/health         → Healthcheck
  POST /api/quiz/generate       → Génère un quiz depuis le RAG sur un sujet donné
  POST /api/quiz/evaluate       → Évalue une réponse (streaming + explication Agent03 si incorrect)
  POST /api/quiz/evaluate/sync  → Même chose, retour synchrone
  POST /api/quiz/session/end    → Clôture de session et bilan pédagogique (FinOps)
"""

import os
import sys
from contextlib import asynccontextmanager

_AGENTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _AGENTS_DIR not in sys.path:
    sys.path.insert(0, _AGENTS_DIR)

from shared.logging import get_logger
from shared.fastapi_base import warmup_rag
from shared.metrics import AgentMetrics as _AgentMetrics, add_metrics_endpoint
_metrics = _AgentMetrics("quiz")

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from quiz_agent import QuizBrainAgent
from schemas import QuizGenerateRequest, QuizEvaluateRequest, EndSessionRequest

logger = get_logger("quiz_api")

brain = QuizBrainAgent()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Démarrage du Serveur FastAPI (Quiz)...")
    await brain.setup()
    logger.info("Lancement du Warm-up réseau (pour éviter les latences au premier appel)...")
    await warmup_rag(brain.search_index_manager, "warmup test réseau quiz")
    logger.info("Index RAG vérifié. Quiz API prête à recevoir des requêtes !")
    yield
    logger.info("Extinction du serveur Quiz...")


app = FastAPI(
    title="Subul Quiz API",
    description=(
        "Agent Quiz pédagogique : génération de QCM/Vrai-Faux depuis les cours (RAG) "
        "+ évaluation avec redirection automatique vers CloudTutor si la réponse est incorrecte."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS added via shared in Docker; for local dev without create_agent_app we add it here
from shared.config import get_config
from fastapi.middleware.cors import CORSMiddleware
config = get_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
add_metrics_endpoint(app)


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/quiz/health")
async def health():
    return {"status": "ok", "service": "Subul Quiz API", "port": 8001}


@app.post("/api/quiz/generate")
async def generate_quiz(request: QuizGenerateRequest):
    """
    Génère un quiz de QCM/Vrai-Faux sur un sujet donné.
    Le contenu est extrait automatiquement du RAG (cours indexés dans Azure Search).
    """
    logger.info(
        "Génération quiz | sujet='%s' | %s questions | lang=%s",
        request.sujet, request.nb_questions, request.lang,
    )

    quiz_agent = brain.get_quiz_agent()
    result = await quiz_agent.generer_quiz(
        sujet=request.sujet,
        nb_questions=request.nb_questions,
        lang=request.lang,
        lesson_content=request.lesson_content,
    )

    if result.get("statut") == "erreur":
        raise HTTPException(status_code=422, detail=result.get("message"))

    return result


@app.post("/api/quiz/evaluate")
async def evaluate_answer(request: QuizEvaluateRequest):
    """
    Évalue la réponse d'un apprenant (streaming NDJSON).

    - Si CORRECT : feedback positif immédiat.
    - Si INCORRECT : feedback + appel automatique à CloudTutor (Agent 03)
      pour une explication approfondie du concept raté, streamée phrase par phrase.

    Format des événements reçus :
      { "type": "evaluation", "data": { ... } }
      { "type": "explication_agent03", "chunk": "...", "status": "streaming" }
      { "type": "explication_agent03", "chunk": "", "status": "completed" }
    """
    logger.info(
        "Évaluation | question='%s' | réponse=%s | user=%s",
        str(request.question.get("question", ""))[:60],
        request.reponse_apprenant,
        request.user_id,
    )

    quiz_agent = brain.get_quiz_agent()

    async def generate_stream():
        async for chunk in quiz_agent.evaluer_reponse_stream(
            question=request.question,
            reponse_apprenant=request.reponse_apprenant,
            session_id=request.session_id,
            user_id=request.user_id,
            lang=request.lang,
        ):
            yield chunk

    return StreamingResponse(generate_stream(), media_type="application/x-ndjson")


@app.post("/api/quiz/evaluate/sync")
async def evaluate_answer_sync(request: QuizEvaluateRequest):
    """
    Version synchrone de l'évaluation (retourne tout d'un coup).
    Utile pour les clients qui ne supportent pas le streaming NDJSON.
    """
    logger.info("Évaluation SYNC | user=%s", request.user_id)

    quiz_agent = brain.get_quiz_agent()
    evaluation = await quiz_agent.evaluer_reponse(
        question=request.question,
        reponse_apprenant=request.reponse_apprenant,
        session_id=request.session_id,
        user_id=request.user_id,
        lang=request.lang,
    )

    if evaluation.get("statut") == "erreur":
        raise HTTPException(status_code=422, detail=evaluation.get("message"))

    return evaluation


@app.post("/api/quiz/session/end")
async def end_session(request: EndSessionRequest):
    """
    Clôture une session quiz et génère un bilan pédagogique sauvegardé en mémoire longue.
    ⚠️ FinOps : À appeler UNIQUEMENT quand l'étudiant quitte l'application.
    """
    logger.info(
        "L'étudiant %s ferme la session quiz %s. Lancement du bilan...",
        request.user_id, request.session_id,
    )

    try:
        await brain.memory.trigger_background_summary(request.user_id, request.session_id)
        return {"status": "success", "message": "Bilan de session quiz généré et sauvegardé en mémoire longue avec succès."}
    except Exception as e:
        logger.exception("Erreur lors de la clôture de session")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du résumé de session quiz.")


# ── Lancement ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
