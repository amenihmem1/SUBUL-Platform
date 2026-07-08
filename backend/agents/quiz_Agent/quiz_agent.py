"""
quiz_agent.py : Agent QUIZ PÉDAGOGIQUE (Génération + Évaluation + Redirection vers CloudTutor)

Fonctionnement :
1. Génère des QCM/Vrai-Faux depuis le contenu RAG (cours indexés)
2. Évalue les réponses de l'apprenant avec feedback personnalisé
3. Si réponse incorrecte → appelle l'Agent 03 (CloudTutor) pour une explication approfondie
"""

import os
import sys
import json
import asyncio
import httpx
import re
from dotenv import load_dotenv
from openai import AsyncAzureOpenAI
from azure.core.credentials import AzureKeyCredential

from memory_management import MemoryManager, CosmosDBAdapter
from search_index_manager import SearchIndexManager

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(os.path.dirname(_BASE_DIR))  # remonte jusqu'à ai-agents/

load_dotenv(os.path.join(_BASE_DIR, ".env.txt"))

# URL de l'agent 03 (CloudTutor) pour les explications en cas d'erreur
AGENT03_URL = os.environ.get("AGENT03_API_URL", "http://localhost:8000")


# ── PROMPTS DÉDIÉS AU QUIZ ─────────────────────────────────────────────────────

PROMPT_GENERATEUR_QUIZ = """Tu es QuizMaster, un expert en création de questions pédagogiques strictement ancrées dans le contenu de cours fourni.

🌍 RÈGLE DE LANGUE (CRITIQUE) :
Réponds TOUJOURS dans la même langue que l'utilisateur.
- S'il te parle en Français → génère le quiz ENTIÈREMENT en Français.
- S'il te parle en Anglais → génère le quiz ENTIÈREMENT en Anglais.

📚 RÈGLE D'OR — ANCRAGE DANS LE CONTENU :
Avant de formuler chaque question, pose-toi cette question mentale :
  « Ce concept est-il EXPLICITEMENT mentionné dans le contenu fourni ? »
  → OUI → tu peux poser la question.
  → NON → tu dois choisir un autre concept du contenu.

❌ ABSOLUMENT INTERDIT :
1. Poser une question sur un concept NON présent dans le contenu fourni (même si lié au sujet général).
2. Inventer des chiffres, prix, commandes, noms de services ou fonctionnalités absents du contenu.
3. Utiliser des connaissances générales sur Azure/AWS/GCP non présentes dans le texte source.
4. Créer des questions sur des fonctionnalités avancées si le contenu est introductif.
5. Répéter la même question sous une forme différente.
6. Formuler des questions ambiguës avec plusieurs bonnes réponses possibles.

✅ OBLIGATOIRE :
1. Chaque question doit pouvoir être répondue UNIQUEMENT avec le contenu fourni — sans aucune connaissance extérieure.
2. L'explication_correcte doit citer ou paraphraser directement le passage source.
3. Varier les niveaux : compréhension (50%), application (30%), analyse (20%).
4. Les 4 options QCM doivent être plausibles — pas de leurres évidents ou absurdes.

🎯 FORMAT DE SORTIE (JSON STRICT — aucun texte avant ou après) :
{
  "sujet": "nom du sujet du quiz",
  "source": "nom du fichier source ou du module",
  "questions": [
    {
      "id": 1,
      "type": "qcm",
      "question": "Texte de la question ?",
      "options": {
        "A": "Première option",
        "B": "Deuxième option",
        "C": "Troisième option",
        "D": "Quatrième option"
      },
      "bonne_reponse": "B",
      "explication_correcte": "Explication courte (1-2 phrases) citant le contenu source."
    },
    {
      "id": 2,
      "type": "vrai_faux",
      "question": "Affirmation à évaluer ?",
      "options": {"A": "Vrai", "B": "Faux"},
      "bonne_reponse": "A",
      "explication_correcte": "Explication courte (1-2 phrases)."
    }
  ]
}

📏 RÈGLES FINALES :
- Génère exactement le nombre de questions demandé.
- Au moins 70% QCM, 30% Vrai/Faux.
- Si le contenu fourni est trop court (< 100 mots), retourne : {"statut": "erreur", "message": "Contenu insuffisant pour générer un quiz pertinent."}
- NE retourne QUE le JSON. Aucun texte, commentaire ou markdown autour.
"""

PROMPT_EVALUATEUR_QUIZ = """Tu es QuizMaster en mode ÉVALUATEUR. Tu évalues la réponse d'un apprenant à une question de quiz.

🌍 RÈGLE DE LANGUE (CRITIQUE) :
Réponds TOUJOURS dans la même langue que la question posée.

🎯 FORMAT DE SORTIE (JSON STRICT) :
Retourne UNIQUEMENT un JSON valide avec cette structure :
{
  "est_correct": true/false,
  "reponse_apprenant": "la lettre choisie par l'apprenant",
  "bonne_reponse": "la bonne lettre",
  "feedback": "Message personnalisé et encourageant pour l'apprenant (2-3 phrases max).",
  "besoin_explication": true/false,
  "topic_pour_agent03": "sujet précis à expliquer si incorrect (ex: 'Explique-moi ce qu\\'est Azure Blob Storage')"
}

📏 RÈGLES D'ÉVALUATION :
- Si CORRECT : feedback positif et motivant. "besoin_explication" = false.
- Si INCORRECT : feedback bienveillant, "besoin_explication" = true, et "topic_pour_agent03" = le concept précis à revoir.
- "topic_pour_agent03" doit être une phrase naturelle pour interroger CloudTutor (ex: "Explique-moi ce qu'est Azure Virtual Network et comment ça fonctionne").
- NE retourne QUE le JSON, sans texte avant ou après.
"""


# ── APPEL VERS L'AGENT 03 (CloudTutor) ────────────────────────────────────────

async def appeler_agent03_pour_explication(
    topic: str,
    session_id: str,
    user_id: str,
    lang: str = "fr",
) -> str:
    """Appelle l'API de l'Agent 03 pour obtenir une explication approfondie d'un concept."""
    payload = {
        "message": topic,
        "user_id": user_id,
        "session_id": session_id,
        "lang": lang,
        "is_audio": False,
    }

    full_explanation = ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", f"{AGENT03_URL}/api/chat", json=payload) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if data.get("status") == "streaming":
                                full_explanation += data.get("chunk", "")
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        full_explanation = f"⚠️ Impossible de contacter CloudTutor pour l'explication : {e}"

    return full_explanation


# ══════════════════════════════════════════════════════════════════════════════

class QuizBrainAgent:
    """
    Classe principale du Quiz Agent — miroir de BrainAgent (Agent 03).
    Initialise et expose les services Azure (OpenAI, Search, CosmosDB).
    """

    def __init__(self):
        self.AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
        self.AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
        self.AZURE_OPENAI_EMBED_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

        self.AZURE_SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
        self.AZURE_SEARCH_API_KEY = os.getenv("AZURE_SEARCH_API_KEY")
        self.AZURE_SEARCH_INDEX = os.getenv("AZURE_SEARCH_INDEX_NAME")
        self.embed_dimensions = int(os.getenv("AZURE_AI_EMBED_DIMENSIONS", 1536))

        self.COSMOS_ENDPOINT = os.getenv("AZURE_COSMOS_ENDPOINT")
        self.COSMOS_KEY = os.getenv("AZURE_COSMOS_KEY")
        self.COSMOS_DB_NAME = os.getenv("AZURE_COSMOS_DATABASE_NAME", "EduTech_AI_Production")
        self.COSMOS_CONTAINER_NAME = os.getenv("AZURE_COSMOS_QUIZ_CONTAINER_NAME", "AgentQuiz")

        print(" Connexion réseau optimisée (IPv4 Force)...")

        custom_http_client = httpx.AsyncClient(
            transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0")
        )

        self.async_client = AsyncAzureOpenAI(
            azure_endpoint=self.AZURE_OPENAI_ENDPOINT,
            api_key=self.AZURE_OPENAI_API_KEY,
            api_version="2024-12-01-preview",
            http_client=custom_http_client
        )

        self.search_index_manager = SearchIndexManager(
            endpoint=self.AZURE_SEARCH_ENDPOINT,
            credential=AzureKeyCredential(self.AZURE_SEARCH_API_KEY),
            index_name=self.AZURE_SEARCH_INDEX,
            dimensions=self.embed_dimensions,
            model=self.AZURE_OPENAI_EMBED_DEPLOYMENT,
            embeddings_client=self.async_client
        )

        cosmos_adapter = CosmosDBAdapter(
            endpoint=self.COSMOS_ENDPOINT,
            key=self.COSMOS_KEY,
            db_name=self.COSMOS_DB_NAME,
            container_name=self.COSMOS_CONTAINER_NAME
        )

        self.memory = MemoryManager(
            oai_client=self.async_client,
            chat_model=self.AZURE_OPENAI_DEPLOYMENT,
            db_adapter=cosmos_adapter
        )

    async def setup(self):
        print("⚙️ Configuration de la base de données Cosmos DB (Quiz)...")
        try:
            await self.memory.db_adapter.setup()
        except Exception as e:
            print(f"⚠️ Cosmos setup failed: {e}")

        print("⚙️ Vérification de l'Index Azure Search (Quiz)...")
        try:
            await self.search_index_manager.ensure_index_created(vector_index_dimensions=self.embed_dimensions)
        except Exception as e:
            print(f"⚠️ Search index setup failed: {e}")

    def get_quiz_agent(self) -> "QuizAgent":
        return QuizAgent(
            oai_client=self.async_client,
            chat_model=self.AZURE_OPENAI_DEPLOYMENT,
            search_manager=self.search_index_manager,
            memory=self.memory,
        )


# ══════════════════════════════════════════════════════════════════════════════

class QuizAgent:
    """
    Agent dédié aux quiz pédagogiques sur les cours cloud.
    - Génère des QCM/Vrai-Faux depuis le RAG
    - Évalue les réponses avec feedback
    - Redirige vers CloudTutor (Agent 03) si la réponse est incorrecte
    """

    def __init__(
        self,
        oai_client: AsyncAzureOpenAI,
        chat_model: str,
        search_manager: SearchIndexManager,
        memory: MemoryManager,
    ):
        self._client = oai_client
        self._chat_model = chat_model
        self._search = search_manager
        self._memory = memory

    # ── UTILITAIRES ───────────────────────────────────────────────────────────

    @staticmethod
    def _detect_cloud(text: str) -> str | None:
        t = text.lower()
        if any(k in t for k in ["azure", "microsoft"]): return "AZURE"
        if any(k in t for k in ["aws", "amazon"]):       return "AWS"
        return None

    @staticmethod
    def _format_context(chunks: list[dict]) -> tuple[str, str]:
        if not chunks:
            return "Aucun document pertinent trouvé.", ""
        source_name = chunks[0].get("source", "Source inconnue")
        ctx_blocks = [
            f"[Source {i} — {c['cloud']} | {c['source']}]\n{c['texte']}"
            for i, c in enumerate(chunks, 1)
        ]
        return "\n\n---\n\n".join(ctx_blocks), source_name

    # ── GÉNÉRATION ────────────────────────────────────────────────────────────

    async def generer_quiz(
        self,
        sujet: str,
        nb_questions: int = 4,
        lang: str = "fr",
        lesson_content: str | None = None,
    ) -> dict:
        """Génère un quiz sur un sujet donné.

        Si `lesson_content` est fourni (titres + points clés des leçons du module),
        il est utilisé directement comme contexte — les questions portent ainsi
        exactement sur ce que l'apprenant vient d'étudier.
        Sinon, le contenu est récupéré via la recherche RAG (comportement historique).
        """
        if lesson_content:
            # Direct lesson context: quiz guaranteed to match what student just studied
            ctx_text = lesson_content[:4000]  # cap to avoid token overflow
            source_name = sujet
        else:
            # Fallback: RAG search
            cloud_filter = self._detect_cloud(sujet)
            chunks = await self._search.search_structured(sujet, top_k=5, cloud_filter=cloud_filter)
            ctx_text, source_name = self._format_context(chunks)

            if not chunks:
                return {
                    "statut": "erreur",
                    "message": (
                        f"Je n'ai pas trouvé de contenu sur '{sujet}' dans les cours."
                        if lang == "fr"
                        else f"No content found about '{sujet}' in the courses."
                    ),
                }

        lang_instruction = (
            f"\n\nIMPORTANT : Génère le quiz ENTIÈREMENT en FRANÇAIS. Sujet : {sujet}. Nombre de questions : {nb_questions}."
            if lang == "fr"
            else f"\n\nIMPORTANT: Generate the quiz ENTIRELY in ENGLISH. Topic: {sujet}. Number of questions: {nb_questions}."
        )

        context_label = "CONTENU DIRECT DU MODULE" if lesson_content else "CONTENU DU COURS (SOURCE RAG)"

        messages = [
            {"role": "system", "content": PROMPT_GENERATEUR_QUIZ},
            {
                "role": "system",
                "content": f"📄 {context_label} :\n{ctx_text}{lang_instruction}",
            },
            {
                "role": "user",
                "content": (
                    f"Génère {nb_questions} questions de quiz sur : {sujet}"
                    if lang == "fr"
                    else f"Generate {nb_questions} quiz questions about: {sujet}"
                ),
            },
        ]

        try:
            response = await self._client.chat.completions.create(
                model=self._chat_model,
                messages=messages,
                max_tokens=2000,
                temperature=0.4,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content.strip()
            quiz_data = json.loads(raw)
            quiz_data["statut"] = "ok"
            quiz_data["source_rag"] = source_name
            return quiz_data

        except json.JSONDecodeError as e:
            return {"statut": "erreur", "message": f"Erreur de format JSON : {e}"}
        except Exception as e:
            return {"statut": "erreur", "message": f"Erreur LLM : {e}"}

    # ── ÉVALUATION ────────────────────────────────────────────────────────────

    async def evaluer_reponse(
        self,
        question: dict,
        reponse_apprenant: str,
        session_id: str,
        user_id: str,
        lang: str = "fr",
    ) -> dict:
        """
        Évalue la réponse d'un apprenant.
        Si incorrect → appelle automatiquement l'Agent 03 pour une explication.
        """
        options_str = "\n".join(
            [f"  {k}: {v}" for k, v in question.get("options", {}).items()]
        )
        eval_context = (
            f"Question : {question.get('question')}\n"
            f"Options :\n{options_str}\n"
            f"Bonne réponse : {question.get('bonne_reponse')}\n"
            f"Explication correcte : {question.get('explication_correcte', '')}\n"
            f"Réponse de l'apprenant : {reponse_apprenant.upper()}"
        )

        lang_instruction = (
            "\n\nRéponds ENTIÈREMENT en FRANÇAIS."
            if lang == "fr"
            else "\n\nAnswer ENTIRELY in ENGLISH."
        )

        messages = [
            {"role": "system", "content": PROMPT_EVALUATEUR_QUIZ},
            {"role": "user", "content": eval_context + lang_instruction},
        ]

        try:
            response = await self._client.chat.completions.create(
                model=self._chat_model,
                messages=messages,
                max_tokens=500,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content.strip()
            evaluation = json.loads(raw)
        except Exception as e:
            return {"statut": "erreur", "message": f"Erreur évaluation : {e}"}

        evaluation["statut"] = "ok"
        evaluation["explication_agent03"] = None

        # Explication approfondie : gérée par Nest (orchestration). Nest appelle Cloud Tutor
        # après avoir reçu cette réponse et renvoie explication_agent03 au frontend.
        if not evaluation.get("est_correct") and evaluation.get("besoin_explication"):
            evaluation["explication_agent03"] = None  # Nest remplira via GET Cloud Tutor

        # Sauvegarde en mémoire (fire-and-forget)
        asyncio.create_task(self._memory.add_user_message(user_id, session_id, f"[Quiz] {question.get('question')} → {reponse_apprenant.upper()}"))
        asyncio.create_task(self._memory.add_agent_message(user_id, session_id, f"[Résultat] correct={evaluation.get('est_correct')} — {evaluation.get('feedback', '')}"))

        return evaluation

    # ── STREAMING D'ÉVALUATION ────────────────────────────────────────────────

    async def evaluer_reponse_stream(
        self,
        question: dict,
        reponse_apprenant: str,
        session_id: str,
        user_id: str,
        lang: str = "fr",
    ):
        """
        Version streaming de l'évaluation.
        Yields : d'abord le résultat d'évaluation, puis l'explication de l'Agent 03 chunk par chunk.
        """
        evaluation = await self.evaluer_reponse(
            question=question,
            reponse_apprenant=reponse_apprenant,
            session_id=session_id,
            user_id=user_id,
            lang=lang,
        )

        explication_a3 = evaluation.pop("explication_agent03", None)
        yield json.dumps({"type": "evaluation", "data": evaluation}) + "\n"

        if explication_a3:
            sentences = re.split(r'(?<=[.!?]) +', explication_a3)
            for sentence in sentences:
                clean = sentence.strip()
                if clean:
                    yield json.dumps({
                        "type": "explication_agent03",
                        "chunk": clean,
                        "status": "streaming",
                    }) + "\n"
                    await asyncio.sleep(0.02)

            yield json.dumps({
                "type": "explication_agent03",
                "chunk": "",
                "status": "completed",
            }) + "\n"
