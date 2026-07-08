import asyncio
import json
import re
import os
import sys
import requests
from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager

_AGENTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _AGENTS_DIR not in sys.path:
    sys.path.insert(0, _AGENTS_DIR)
from shared.metrics import AgentMetrics, add_metrics_endpoint, health_response
_metrics = AgentMetrics("cloud-tutor")

from typing import Optional
from langdetect import detect 

from agent_rag import BrainAgent



current_dir = os.path.dirname(os.path.abspath(__file__))
root_path = os.path.abspath(os.path.join(current_dir, '..', '..'))

if root_path not in sys.path:
    sys.path.append(root_path)

try:
    from Shared_Core.quota_manager import quota_manager
    print(f" Shared_Core trouvé dans : {root_path}")
except ImportError:
    # Stub when Shared_Core is not present (e.g. Docker build without shared core)
    class _StubQuotaManager:
        async def setup(self): pass
        async def consume_voice_credit(self, user_id: str) -> bool: return True
        async def get_remaining_credits(self, user_id: str) -> int: return 176
    quota_manager = _StubQuotaManager()
    print(" Shared_Core non trouvé : utilisation du quota_manager stub (crédits illimités).")


brain = BrainAgent()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(" Démarrage du Serveur FastAPI (Subul Tuteur)...")
    await brain.setup()
    
    print(" Configuration de la table des Quotas (Cosmos DB)...")
    
    await quota_manager.setup() 

    print(" Lancement du Warm-up réseau (pour éviter les 13s de latence au premier client)...")
    try:
        await brain.search_index_manager.search("warmup test réseau")
        print(" Réseau débouché et prêt (IPv4) !")
    except Exception as e:
        print(f" Warm-up a échoué, mais l'API continue : {e}")

    print("Index RAG vérifié. API prête à recevoir des requêtes !")
    yield 
    print(" Extinction du serveur...")

app = FastAPI(title="Subul API Web", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_metrics_endpoint(app)

@app.get("/health", tags=["Monitoring"])
async def health():
    return health_response("cloud-tutor")

class ChatRequest(BaseModel):
    message: str
    user_id: str = "etudiant_anonyme"
    session_id: str = "session_defaut"
    lang: str = "fr"
    is_audio: bool = False
    narration: bool = False
    # Optional course / lab context forwarded by the frontend so retrieval
    # can be scoped to the entity the learner is currently viewing.
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    course_title: Optional[str] = None
    lesson_title: Optional[str] = None
    lab_slug: Optional[str] = None
    context: Optional[str] = None
    # Allow forward-compat with extra fields without 422-ing.
    class Config:
        extra = "ignore"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        lang_code = detect(request.message)
        final_lang = "fr" if "fr" in lang_code else "en"
    except:
        final_lang = "fr"

    print(
        f"📨 Requête de [{request.user_id} - {request.session_id}] : '{request.message}' | "
        f"Langue : {final_lang} | Audio : {request.is_audio} | "
        f"course_id={request.course_id or '-'} | lesson_id={request.lesson_id or '-'} | "
        f"lab_slug={request.lab_slug or '-'}"
    )
    
   
    quota_message_systeme = ""
    if request.is_audio:
    
        has_credits = await quota_manager.consume_voice_credit(request.user_id)
        
        if not has_credits:
            request.is_audio = False 
            
            
            if final_lang == "fr":
                quota_message_systeme = "\n\n(RÈGLE ABSOLUE : Commence ta réponse par 'Tu as utilisé tes 176 crédits vocaux pour ce mois-ci, je passe donc en mode texte pour t'aider !' puis réponds à sa question.)"
            else:
                quota_message_systeme = "\n\n(ABSOLUTE RULE: Start your response with 'You have exhausted your 176 voice credits for this month, so I will switch to text mode to help you!' then answer the question.)"
    

    agent = brain.get_agent(
        lang=final_lang,
        is_audio=request.is_audio,
        course_id=request.course_id,
        course_title=request.course_title,
        lesson_title=request.lesson_title,
        lab_slug=request.lab_slug,
    )
    
    async def generate_response():
        try:
            consigne_langue = "\n\n(Règle stricte: Formule ta réponse IMPÉRATIVEMENT en Français.)" if final_lang == "fr" else "\n\n(Strict rule: Answer entirely in English.)"
            # Narration (lesson read-aloud): system prompt in BrainAgent already enforces language; no duplicate in user turn
            extra_lang = "" if request.narration else consigne_langue
            message_securise = request.message + extra_lang + quota_message_systeme

            run_kwargs = {
                "message": message_securise,
                "user_id": request.user_id,
                "session_id": request.session_id,
                "course_id": request.course_id,
                "lab_slug": request.lab_slug,
            }

            if not request.is_audio:
                async for chunk in agent.run_stream(**run_kwargs):
                    payload = {"chunk": chunk, "status": "streaming", "lang": final_lang}
                    yield json.dumps(payload) + "\n"
                
                yield json.dumps({"chunk": "", "status": "completed", "lang": final_lang}) + "\n"

            else:
                full_text = ""
                async for chunk in agent.run_stream(**run_kwargs):
                    full_text += chunk
                
                
                sentences = re.split(r'(?<=[.!?]) +', full_text)
                for sentence in sentences:
                    clean_sentence = sentence.strip()
                    if clean_sentence:
                        payload = {"chunk": clean_sentence, "status": "streaming", "lang": final_lang}
                        yield json.dumps(payload) + "\n"
                        await asyncio.sleep(0.05) 
                
                yield json.dumps({"chunk": "", "status": "completed", "lang": final_lang}) + "\n"
                
        except Exception as e:
            print(f" Erreur API : {e}")
            yield json.dumps({"chunk": f"Erreur serveur: {e}", "status": "error"}) + "\n"

    return StreamingResponse(generate_response(), media_type="application/x-ndjson")

@app.get("/api/tts")
def tts_endpoint(text: str, lang: str = "fr"):
    print(f"🔊 Demande Cartesia TTS ({lang}) : {text}")
    
    voice_id = "6ccbfb76-1fc6-48f7-b71d-91ac6298247b" if lang == "en" else "f786b574-daa5-4673-aa0c-cbe3e8534c02"
    
    CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
    CARTESIA_URL = "https://api.cartesia.ai/tts/bytes"
    
    headers = {
        "X-API-Key": CARTESIA_API_KEY,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json"
    }

    payload = {
        "model_id": "sonic-3",
        "transcript": text,
        "voice": {
            "mode": "id",
            "id": voice_id
        },
        "output_format": {
            "container": "wav",
            "encoding": "pcm_f32le",
            "sample_rate": 44100
        },
        "language": lang,
        "generation_config": {
            "speed": 1,
            "volume": 1
        }
    }
    
    try:
        response = requests.post(CARTESIA_URL, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f" Erreur Serveur Cartesia: {response.text}")
            raise HTTPException(status_code=500, detail=f"Erreur Cartesia: {response.text}")

        return Response(content=response.content, media_type="audio/wav")
        
    except Exception as e:
        print(f" Erreur locale TTS : {e}")
        try:
            raise HTTPException(status_code=500, detail=str(e))
        except NameError:
            return {"error": str(e)}


@app.get("/api/quota/{user_id}")
async def check_quota(user_id: str):
    try:
        
        remaining = await quota_manager.get_remaining_credits(user_id)
        return {"remaining_credits": remaining, "max_credits": 176}
    except Exception as e:
        print(f" Erreur lecture quota: {e}")
        return {"remaining_credits": 176, "max_credits": 176} 


class EndSessionRequest(BaseModel):
    user_id: str
    session_id: str

@app.post("/api/session/end")
async def end_session(request: EndSessionRequest):
    print(f" [API] L'étudiant {request.user_id} ferme la session {request.session_id}. Lancement du bilan pédagogique...")

    try:
        await brain.memory.trigger_background_summary(request.user_id, request.session_id)
        return {"status": "success", "message": "Bilan de session généré et sauvegardé en mémoire longue avec succès."}
    except Exception as e:
        print(f" [API] Erreur lors de la clôture de session: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du résumé de session.")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
