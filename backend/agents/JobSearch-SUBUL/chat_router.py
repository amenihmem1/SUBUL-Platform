"""
chat_router.py — Module Chatbot IT JobScan
==========================================
Responsabilités :
  - System prompt expert IT avec profil + jobs réels (PostgreSQL)
  - POST /api/chat         → répondre via Azure OpenAI GPT-4o-mini
  - GET  /api/chat/history → retourner l'historique de conversation

Usage dans main.py :
    from chat_router import chat_router
    app.include_router(chat_router)
"""

import asyncio
import logging
import os
import time
from datetime import datetime

from fastapi import APIRouter
from openai import AsyncAzureOpenAI
from pydantic import BaseModel

# ── Détection de langue ───────────────────────────────────────────────────────
try:
    from langdetect import detect as _detect_lang
    _LANGDETECT_AVAILABLE = True
except ImportError:
    _LANGDETECT_AVAILABLE = False

_COMMON_EN = frozenset((
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "goodmorning", "goodnight", "thanks", "thank you", "ok", "okay", "yes", "no",
    "in english", "english please", "in english please", "answer in english",
    "respond in english", "reply in english", "i want answers in english",
))
_COMMON_FR = frozenset((
    "bonjour", "bonsoir", "salut", "coucou", "merci", "oui", "non", "ok", "d'accord",
    "bonne nuit", "bonne soirée", "bonne journée", "à bientôt", "s'il te plaît",
    "en français", "en francais", "en français s'il te plaît", "réponds en français",
))
_FR_STARTERS = (
    "je veux", "je voudrais", "comment ", "pourquoi ", "qu'est-ce", "c'est quoi",
    "quel est", "combien ", "est-ce que", "peux-tu", "pouvez-vous", "aide-moi",
    "aide moi", "dis-moi", "explique", "donne-moi", "je cherche", "j'aimerais",
)


def _detect_response_language(message: str) -> str:
    msg = (message or "").strip()
    if not msg:
        return "fr"
    low = msg.lower().strip()
    if any(phrase in low for phrase in (
        "in english", "english please", "answer in english", "respond in english",
        "reply in english", "i want answers in english", "in english please",
    )):
        return "en"
    if any(phrase in low for phrase in (
        "en français", "en francais", "réponds en français", "in french",
        "reponds en francais", "pas en français", "pas en francais",
    )):
        return "fr"
    if any(low.startswith(s) for s in _FR_STARTERS):
        return "fr"
    if len(msg) <= 30:
        if low in _COMMON_EN:
            return "en"
        if any(low.startswith(p) for p in ("hi ", "hello ", "hey ", "good morning", "good afternoon", "good evening", "goodmorning ")):
            return "en"
        if low in _COMMON_FR or any(low.startswith(p) for p in ("bonjour", "bonsoir", "salut", "merci ")):
            return "fr"
    if _LANGDETECT_AVAILABLE:
        try:
            code = _detect_lang(msg)
            return "fr" if code == "fr" else "en"
        except Exception:
            pass
    return "en"


# ── Imports DB ────────────────────────────────────────────────────────────────
from database import (
    get_user,
    get_jobs_for_user,
    save_chat_message as _save_chat_msg,
    load_chat_history as _load_chat_history,
)
from db_platform import get_platform_data_or_fallback, fetch_recommendations

logger      = logging.getLogger(__name__)
chat_router = APIRouter(tags=["Chatbot"])


# ═══════════════════════════════════════════════════════════════════════════════
#  Pydantic models
# ═══════════════════════════════════════════════════════════════════════════════

class ProfileIn(BaseModel):
    name:                str       = ""
    target_role:         str       = ""
    experience_years:    int       = 0
    skills:              list[str] = []
    preferred_locations: list[str] = []
    open_to_remote:      bool      = True
    salary_expectation:  str       = ""
    user_id:             str       = ""


class ChatIn(BaseModel):
    message: str
    profile: ProfileIn | None = None
    user_id: str = ""
    jobs_context: list[dict] = []
    chat_history: list[dict] | None = None


# ═══════════════════════════════════════════════════════════════════════════════
#  Azure OpenAI client factory
# ═══════════════════════════════════════════════════════════════════════════════

def _azure_client() -> AsyncAzureOpenAI:
    return AsyncAzureOpenAI(
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "https://oai-subul-tuteur-dev.openai.azure.com/"),
        api_key        = os.getenv("AZURE_OPENAI_API_KEY", "AtUsLTTtFlNA1cBoSprUS5UNX50PUDtHDJ7orkCrCsjoULxkiX2PJQQJ99CBACHYHv6XJ3w3AAABACOGagoi"),
        api_version    = os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  System Prompt helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _build_source_index(jobs: list[dict]) -> str:
    from collections import defaultdict
    src_map: dict = defaultdict(list)
    for j in jobs:
        src = (j.get("source") or "unknown").strip()
        src_map[src].append(j.get("title", "?"))
    lines = []
    for src, titles in sorted(src_map.items(), key=lambda x: -len(x[1])):
        sample = ", ".join(titles[:4])
        suffix = f"… +{len(titles)-4} autres" if len(titles) > 4 else ""
        lines.append(f"- **{src}** : {len(titles)} job(s) — ex: {sample}{suffix}")
    return "".join(lines) if lines else "Aucune source disponible."


def _build_location_index(jobs: list[dict]) -> str:
    from collections import defaultdict
    loc_map: dict = defaultdict(list)
    for j in jobs:
        loc = (j.get("location") or "Unknown").strip()
        loc_map[loc].append(j.get("title", "?"))
    lines = []
    for loc, titles in sorted(loc_map.items(), key=lambda x: -len(x[1])):
        lines.append(f"- {loc} ({len(titles)} jobs): {', '.join(titles[:5])}{'…' if len(titles)>5 else ''}")
    return "\n".join(lines) if lines else "Aucune localisation disponible."

def _extract_cv_certs(cv_text: str) -> list[str]:
    """Extrait les lignes de certifications depuis un cv_raw_text brut."""
    if not cv_text:
        return []
    lines = cv_text.splitlines()
    certs = []
    in_section = False
    for line in lines:
        stripped = line.strip()
        # Détecter la section CERTIFICATES / CERTIFICATIONS
        if stripped.upper() in ("CERTIFICATES", "CERTIFICATIONS", "CERTIFICATS", "CERTIFICATIONS:"):
            in_section = True
            continue
        # Stopper à la prochaine section (ligne tout en majuscules)
        if in_section and stripped and stripped.isupper() and len(stripped) > 3:
            break
        # Collecter les lignes de la section
        if in_section and stripped:
            certs.append(stripped)
    return certs
def _build_chat_system_prompt(
    db_user: dict | None,
    db_jobs: list[dict],
    platform_data: dict | None,
    recommendations: dict | None,
) -> str:
    """Construit le system prompt avec données réelles profil (Cosmos) + jobs + certifs/labs."""

    # ── BLOC PROFIL — depuis CosmosDB champ cv_raw_text + champs structurés ──
    if db_user:
        logger.debug(f"[prompt] db_user found: role='{db_user.get('role')}' skills='{db_user.get('skills')}'")

        # Champ principal : cv_raw_text (texte brut du CV uploadé)
        cv_text = (db_user.get("cv_raw_text") or db_user.get("raw_text") or "").strip()

        # Champs structurés CosmosDB — toujours prioritaires
        first_name = db_user.get("first_name", "") or ""
        last_name  = db_user.get("last_name", "") or ""
        full_name  = f"{first_name} {last_name}".strip() or "Non renseigné"
        role       = db_user.get("role", "") or "Non renseigné"
        seniority  = db_user.get("seniority", "") or "Non renseigné"
        years_exp  = db_user.get("years_experience", "") or db_user.get("experience_years", 0)
        education  = db_user.get("education", "") or "Non renseigné"
        languages  = db_user.get("languages", "") or "Non renseigné"
        linkedin   = db_user.get("linkedin", "") or "Non renseigné"
        email      = db_user.get("email", "") or "Non renseigné"
        summary    = db_user.get("summary", "") or "Non renseigné"

        # Skills : liste ou string selon comment CosmosDB les stocke
        raw_skills = db_user.get("skills", "") or ""
        if isinstance(raw_skills, list):
            skills_str = ", ".join(raw_skills) if raw_skills else "Non renseigné"
        else:
            skills_str = str(raw_skills).strip() or "Non renseigné"

        # Ajouter le texte brut du CV comme contexte supplémentaire si disponible
        cv_section = (
            f"\n- CV Complet    : {cv_text[:800]}{'...' if len(cv_text) > 800 else ''}"
            if cv_text else ""
        )

        # Extraire les certifs du CV pour les mettre dans le profil
        cv_certs_for_profile = _extract_cv_certs(cv_text)
        cv_certs_str = ", ".join(cv_certs_for_profile) if cv_certs_for_profile else "Non renseigné"

        user_block = f"""## PROFIL DE L'UTILISATEUR (CosmosDB · champ `cv_raw_text` + champs structurés)
- Nom           : {full_name}
- Email         : {email}
- LinkedIn      : {linkedin}
- Rôle cible    : {role}
- Séniorité     : {seniority}
- Expérience    : {years_exp} ans
- Formation     : {education}
- Langues       : {languages}
- Compétences   : {skills_str}
- Certifications: {cv_certs_str}
- Résumé        : {summary}{cv_section}"""

    else:
        # FIX: uid n'existe pas dans ce scope — on log sans uid
        logger.info("[prompt] no profile found in Cosmos DB — db_user is None")
        user_block = (
            "## PROFIL DE L'UTILISATEUR\n"
            "- Statut : Profil non encore chargé depuis la base de données.\n"
            "- Action requise : L'utilisateur doit uploader son CV ou compléter son profil.\n"
            "- IMPORTANT : Ne pas dire 'No profile found' — dire plutôt que le profil n'est pas encore disponible."
        )

    # ── Bloc certifications/labs depuis shared DB (PostgreSQL) ───────────────
    plat  = platform_data or {}
    labs  = plat.get("labs", []) or []
    certs = plat.get("certifications", []) or []
    quiz  = plat.get("quiz")

    if certs:
        certs_lines = "\n".join(
            [f"- [{c.get('date','?')}] {c.get('title','?')} ({c.get('org','?')})" for c in certs]
        )
    else:
        # Fallback : extraire les certifs depuis le cv_raw_text de CosmosDB
        cv_text_for_certs = ""
        if db_user:
            cv_text_for_certs = (db_user.get("cv_raw_text") or db_user.get("raw_text") or "").strip()
        cv_certs = _extract_cv_certs(cv_text_for_certs)
        if cv_certs:
            certs_lines = "(source: CV uploadé)\n" + "\n".join([f"- {c}" for c in cv_certs])
        else:
            certs_lines = "- Aucune certification terminée enregistrée."
    labs_lines = (
        "\n".join([
            f"- [{'completed' if c.get('is_completed') else 'en cours'}] "
            f"{c.get('title', c.get('id','?'))} "
            f"({'completed' if c.get('is_completed') else 'en cours'})"
            for c in labs
        ])
        if labs else "- Aucun lab complété ou en cours."
    )

    recs      = recommendations or {}
    rec_certs = recs.get("certifications", []) or []
    rec_labs  = recs.get("labs", []) or []
    recs_lines = []
    if rec_certs:
        recs_lines.append("### Certifications recommandées disponibles :")
        recs_lines.extend([f"- {c.get('title','?')} ({c.get('provider','?')}, {c.get('level','?')})" for c in rec_certs])
    if rec_labs:
        recs_lines.append("### Labs recommandés disponibles :")
        recs_lines.extend([f"- {l.get('title','?')}" for l in rec_labs])
    if not recs_lines:
        recs_lines = ["- Aucune recommandation de lab/certif disponible actuellement."]

    platform_block = (
        f"## DATASPLATFORM\n- Quiz : {quiz.get('domain','N/A')} ({quiz.get('level','N/A')}, score {quiz.get('score', 0)})"
        if quiz else "## DATASPLATFORM\n- Aucun résultat de quiz disponible."
    )
    platform_block += "\n\n## CERTIFICATIONS TERMINÉES / EN COURS\n" + certs_lines
    platform_block += "\n\n## LABS TERMINÉS / EN COURS\n" + labs_lines
    platform_block += "\n\n## RECOMMANDATIONS D'APPRENTISSAGE (DISPONIBLES)\n" + "\n".join(recs_lines)

    # ── Bloc jobs ─────────────────────────────────────────────────────────────
    if db_jobs:
        def _norm_score(j: dict) -> float:
            v = float(j.get("match_score") or j.get("total") or 0)
            if v < 0:
                v = 0.0
            return v / 100.0 if v > 1 else v

        sorted_jobs = sorted(db_jobs, key=_norm_score, reverse=True)
        total       = len(sorted_jobs)
        scores      = [_norm_score(j) for j in sorted_jobs]
        avg         = sum(scores) / total if total else 0
        best        = sorted_jobs[0]
        worst       = sorted_jobs[-1]
        best_score  = scores[0]
        worst_score = scores[-1]
        excellent   = sum(1 for s in scores if s >= 0.70)
        good        = sum(1 for s in scores if 0.50 <= s < 0.70)
        moderate    = sum(1 for s in scores if 0.30 <= s < 0.50)
        low_score   = sum(1 for s in scores if s < 0.30)

        def _fmt_job(idx: int, j: dict) -> str:
            gap           = j.get("gap_missing", j.get("missing", []))
            must_have_str = j.get("skills_req") or j.get("must_have") or ""
            all_req       = [s.strip() for s in must_have_str.split(",") if s.strip()]
            gap_lower     = {g.lower() for g in gap}
            matched       = [s for s in all_req if s.lower() not in gap_lower]
            raw_score     = j.get("match_score") or j.get("total") or 0
            score_computed = raw_score is not None and float(raw_score) > 0
            if raw_score is None or raw_score < 0:
                raw_score = 0.0
            ai_score = float(raw_score)
            if ai_score > 1:
                ai_score = ai_score / 100
            cosine = float(j.get("cosine", 0) or 0)
            if cosine > 1:
                cosine = cosine / 100
            gt          = int(j.get("gap_total", len(all_req)) or 0)
            gc          = len(matched)
            miss        = ", ".join(gap) if gap else "aucun"
            matched_str = ", ".join(matched[:5]) if matched else "—"
            company     = j.get("industry") or j.get("company", "?")
            score_str   = f"{ai_score*100:.1f}%" if score_computed else "N/A"
            return (
                f"{idx}. [score:{score_str}] **{j.get('title','?')}** @ {company} | "
                f"loc:{j.get('location','?')} | remote:{j.get('remote','?')} | "
                f"cosine:{cosine*100:.1f}% | "
                f"skills:{gc}/{gt} matched:[{matched_str}] missing:[{miss}] | "
                f"salary:{j.get('salary','Non spécifié')} | "
                f"contract:{j.get('contract','?')} | seniority:{j.get('experience','?')} | "
                f"source:{j.get('source','?')} | url:{j.get('url','')}"
            )

        all_lines         = [_fmt_job(i + 1, j) for i, j in enumerate(sorted_jobs)]
        scores_computed   = [s for s in scores if s > 0]
        scoring_available = len(scores_computed) > 0
        best_score_str    = f"{best_score*100:.1f}%" if scoring_available else "N/A (scan required)"
        worst_score_str   = f"{worst_score*100:.1f}%" if scoring_available else "N/A"
        avg_str           = f"{avg*100:.1f}%" if scoring_available else "N/A"

        jobs_block = (
            f"## JOBS DÉTECTÉS — {total} jobs au total\n"
            f"(triés par SCORE MATCHING = AI BiEncoder match_score, du meilleur au moins bon)\n\n"
            f"### 📊 STATISTIQUES (basées sur le score matching AI)\n"
            f"- 🏆 MEILLEUR SCORE : [{best_score_str}] **{best.get('title','?')}** @ {best.get('industry','?')} | {best.get('location','?')} | url:{best.get('url','')}\n"
            f"- 📉 SCORE LE PLUS BAS : [{worst_score_str}] **{worst.get('title','?')}** @ {worst.get('industry','?')} | {worst.get('location','?')} | url:{worst.get('url','')}\n"
            f"- 📈 MOYENNE  : {avg_str}\n"
            f"- Distribution : ≥70%→{excellent} | 50-70%→{good} | 30-50%→{moderate} | <30%→{low_score}\n\n"
            f"### 🌐 INDEX PAR SOURCE DE SCRAPING\n"
            + _build_source_index(sorted_jobs)
            + f"\n\n### 📍 INDEX PAR LOCALISATION\n"
            + _build_location_index(sorted_jobs)
            + f"\n\n### 📋 LISTE COMPLÈTE ({total} jobs)\n"
            + "\n".join(all_lines)
        )
    else:
        jobs_block = "## JOBS DÉTECTÉS\nAucun job trouvé pour cet utilisateur."

    return f"""Tu es **JobScan AI**, un assistant expert en IT et carrière tech, intégré dans la plateforme JobScan.

{user_block}

{platform_block}

---

### ✅ RÈGLE ABSOLUE — RÉPONSES SUR LE PROFIL
**Réponds UNIQUEMENT à ce que l'utilisateur demande. Ne jamais donner plus d'informations que demandé.**

- "what are my skills" / "my skills" / "mes compétences" → Donne UNIQUEMENT le champ **Compétences**. Rien d'autre.
- "my linkedin" / "mon linkedin" → Donne UNIQUEMENT le champ **LinkedIn**. Rien d'autre.
- "my email" / "mon email" → Donne UNIQUEMENT le champ **Email**. Rien d'autre.
- "my experience" / "mon expérience" → Donne UNIQUEMENT le champ **Expérience**. Rien d'autre.
- "my education" / "ma formation" → Donne UNIQUEMENT le champ **Formation**. Rien d'autre.
- "my certifications" / "mes certifications" → Donne UNIQUEMENT le champ **Certifications**. Rien d'autre.
- "my name" / "mon nom" → Donne UNIQUEMENT le champ **Nom**. Rien d'autre.
- "my role" / "mon rôle" → Donne UNIQUEMENT le champ **Rôle cible**. Rien d'autre.
- "my summary" / "mon résumé" → Donne UNIQUEMENT le champ **Résumé**. Rien d'autre.
- "my profile" / "mon profil" / "qui suis-je" / "who am i" → Donne le profil COMPLET structuré.

**Source OBLIGATOIRE : utilise les données du bloc PROFIL DE L'UTILISATEUR et du bloc CERTIFICATIONS TERMINÉES / EN COURS ci-dessus.**
**NE DIS JAMAIS "No profile found" ou "Please upload your CV" si des données existent dans le profil ou dans les certifications.**
**Si le profil EST VRAIMENT vide (tous les champs = "Non renseigné") → dis : "Your profile is not loaded yet. Please upload your CV."**
**Pour les certifications : cherche dans le champ "Certifications" du profil ET dans le bloc CERTIFICATIONS TERMINÉES / EN COURS.**
**NE JAMAIS inventer ou deviner des informations non présentes dans le profil.**

{jobs_block}

---

## COMPORTEMENT GÉNÉRAL

### ✅ SALUTATIONS & CONVERSATION
Si l'utilisateur dit "hi", "hello", "bonjour", "salut", "hey" ou toute salutation →
**Réponds chaleureusement** : salue-le, présente-toi brièvement, propose ton aide.
Exemple : "Bonjour ! Je suis JobScan AI, ton assistant carrière IT. Comment puis-je t'aider aujourd'hui ?"
**NE JAMAIS refuser une salutation.**

### ✅ QUESTIONS SUR LES JOBS
Si l'utilisateur pose une question sur ses jobs →
**Utilise UNIQUEMENT les données exactes fournies ci-dessus.**

⚠️ SOURCES DE SCRAPING :
- Les sources sont listées dans l'**INDEX PAR SOURCE DE SCRAPING** ci-dessus
- Pour toute question sur les sources → recopie EXACTEMENT les sources listées dans l'index
- NE JAMAIS inventer ou deviner des sources non présentes dans l'index

⚠️ DÉFINITION DU SCORE :
- "score", "score matching", "match score" = TOUJOURS le champ `score:XX%` de la liste
- Ce score = AI BiEncoder (match_score) UNIQUEMENT
- Ne jamais mentionner "combined score" comme étant "le score"
- Le cosine (`cosine:XX%`) est différent — ne pas le confondre avec le score matching
- MEILLEUR score = job #1 en haut de la liste
- PLUS BAS score = dernier job en bas de la liste
- Recopier le score EXACTEMENT tel qu'écrit (ex: 9.6%, 3.2%, 50.0%) sans arrondir
- Si le score est `N/A` ou `0.0%` → NE JAMAIS mentionner le score. Présente le job par son titre, entreprise, localisation uniquement.
- Si TOUS les scores sont N/A → dis "Lance d'abord un scan pour obtenir des scores de matching personnalisés"

### ✅ QUESTIONS IT GÉNÉRALES
Réponds à TOUTES les questions liées à l'informatique, la technologie et la carrière tech :
Hardware, Software, Réseaux, Développement, Cloud, DevOps, IA, Cybersécurité, Carrière IT...

---

## TON DOMAINE — L'INFORMATIQUE AU SENS LARGE

**Hardware & Matériel :** PC, ordinateur, laptop, disque dur, SSD, RAM, processeur, CPU, GPU,
carte graphique, carte mère, écran, clavier, souris, serveur, datacenter, smartphone, tablette,
routeur, switch, modem...

**Systèmes & Software :** Windows, Linux, macOS, Ubuntu, Android, iOS, OS, logiciel, application,
driver, firmware, antivirus, mise à jour, virtualisation, VM...

**Réseaux & Internet :** HTTP, HTTPS, DNS, TCP/IP, VPN, WiFi, Ethernet, protocole, pare-feu,
SSL, TLS, SSH, FTP, proxy, navigateur...

**Développement & Code :** Python, JavaScript, TypeScript, Java, C, C++, C#, Go, Rust, PHP,
SQL, Bash, API, REST, GraphQL, Git, GitHub, algorithme, debug, IDE...

**Cloud & DevOps :** Azure, AWS, GCP, Docker, Kubernetes, Terraform, CI/CD, pipeline,
microservices, serverless, Nginx, monitoring...

**IA & Data Science :** LLM, GPT, machine learning, deep learning, NLP, TensorFlow, PyTorch,
Pandas, NumPy, Spark, ETL, dataset, modèle, inférence...

**Cybersécurité :** virus, malware, phishing, chiffrement, OAuth, JWT, pentest, OWASP, firewall...

**Carrière IT :** développeur, ingénieur, DevOps, data scientist, salaire, entretien technique, CV...

---

### ❌ REFUSE SEULEMENT (clairement hors IT) :
Recettes de cuisine · Sport · Médecine · Politique · Météo · Tourisme · Animaux · Physique non-informatique

### ⚠️ RÈGLE D'OR : EN CAS DE DOUTE → RÉPONDS

---

## RÈGLES DE RÉPONSE
1. **Réponds dans la langue de l'utilisateur** (français, anglais, arabe...)
2. **Utilise le markdown** : titres, listes, blocs de code, gras
3. **Jobs : cite les données EXACTES** — recopie le score, la source, la localisation tels quels
4. **Score minimum** = le dernier job de la liste (index le plus élevé)
5. **Ne jamais dire qu'un job n'existe pas** — dis plutôt "je ne vois pas ce job dans les données actuelles"
6. **Réponds en expert** : précis, concret, exemples de code si utile
7. **Jamais d'inventions** : si une info manque, dis-le clairement

Date : {datetime.now().strftime('%Y-%m-%d')}"""


# ═══════════════════════════════════════════════════════════════════════════════
#  Helpers internes
# ═══════════════════════════════════════════════════════════════════════════════

async def _safe_save_msg(uid: int, role: str, content: str):
    """Sauvegarde non-bloquante d'un message chat en DB."""
    try:
        await _save_chat_msg(uid, role, content)
    except Exception as e:
        logger.warning(f"[chat] save_msg failed: {e}")


async def _auto_summarize(uid: int, history: list, deployment: str):
    """Résumé automatique si historique > 8 messages."""
    try:
        convo = "\n".join(
            [f"{m['role'].upper()}: {m['content'][:200]}" for m in history[-8:]]
        )
        prompt = (
            "Résume en 3 lignes maximum les sujets IT abordés dans "
            "cette conversation JobScan :\n\n"
            f"{convo}\n\nRéponds uniquement avec le résumé, sans introduction."
        )
        async with _azure_client() as az:
            resp = await az.chat.completions.create(
                model       = deployment,
                messages    = [{"role": "user", "content": prompt}],
                max_tokens  = 150,
                temperature = 0.1,
            )
        summary = resp.choices[0].message.content or ""
        if summary:
            await _save_chat_msg(uid, "assistant", f"[RÉSUMÉ SESSION] {summary}")
            logger.info(f"[chat] auto-summary saved for user={uid}")
    except Exception as e:
        logger.warning(f"[chat] auto_summarize failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  Routes FastAPI
# ═══════════════════════════════════════════════════════════════════════════════

@chat_router.post("/api/chat")
async def api_chat(data: ChatIn):
    t0 = time.time()

    # ── Résoudre user_id ──────────────────────────────────────────────────────
    uid_str = (data.user_id or "").strip()
    if not uid_str and data.profile:
        uid_str = (data.profile.user_id or "").strip()
    uid = 0
    if uid_str:
        try:
            uid = int(uid_str)
        except (ValueError, TypeError):
            logger.warning(f"[chat] user_id '{uid_str}' invalide — uid forcé à 0")
            uid = 0
    if uid == 0:
        logger.warning("[chat] ⚠️ uid=0 — aucun user_id valide reçu. Le profil sera vide.")

    logger.info(f"[chat] POST /api/chat — received user_id='{data.user_id}' profile.user_id='{data.profile.user_id if data.profile else 'N/A'}' → resolved uid={uid}")
    logger.info(f"[chat] message='{data.message[:50]}...' uid={uid}")

    detected_lang = _detect_response_language(data.message or "")

    # ── Chargement parallèle depuis DB ────────────────────────────────────────
    logger.info(f"[chat] about to create async functions for uid={uid}")

    async def _get_user():
        logger.info(f"[chat] _get_user: STARTING call to get_user({uid})")
        if uid <= 0:
            return None
        for attempt in range(3):  # 3 tentatives
            try:
                result = await get_user(uid)
                if result is not None:
                    logger.info(f"[chat] _get_user: ✓ found user on attempt {attempt+1}")
                    return result
                logger.warning(f"[chat] _get_user: attempt {attempt+1} returned None")
            except Exception as e:
                logger.error(f"[chat] _get_user: attempt {attempt+1} error: {e}")
            if attempt < 2:
                await asyncio.sleep(0.5)  # attendre 500ms avant retry
        logger.error(f"[chat] _get_user: all 3 attempts failed for uid={uid}")
        return None
    async def _get_jobs():
        logger.info(f"[chat] _get_jobs: calling get_jobs_for_user({uid})")
        return await get_jobs_for_user(uid) if uid > 0 else []

    async def _get_history():
        if uid > 0:
            try:
                return await _load_chat_history(uid, limit=20)
            except Exception:
                return []
        return []

    async def _get_platform_data():
        if uid > 0:
            return await asyncio.to_thread(get_platform_data_or_fallback, str(uid))
        return {"status": "no_user_id", "quiz": None, "labs": [], "certifications": []}

    # FIX: ajout du 2e argument obligatoire quiz_domain="" (fallback vide)
    async def _get_recommendations():
        if uid > 0:
            return await asyncio.to_thread(fetch_recommendations, str(uid), "")
        return {"certifications": [], "labs": []}

    # FIX: logger.info sorti de la fonction (était après return → jamais exécuté)
    logger.info(f"[chat] async functions created, about to call gather")

    try:
        logger.info(f"[chat] starting asyncio.gather for uid={uid}")
        db_user, db_jobs, history, platform_data, recommendations = await asyncio.wait_for(
            asyncio.gather(_get_user(), _get_jobs(), _get_history(), _get_platform_data(), _get_recommendations()),
            timeout=20.0
        )
        logger.info(f"[chat] asyncio.gather completed successfully")
    except asyncio.TimeoutError:
        logger.warning("[chat] DB timeout après 20s — tentative de récupération user seul")
        # Essayer quand même de récupérer le user seul
        try:
            db_user = await asyncio.wait_for(get_user(uid), timeout=5.0) if uid > 0 else None
        except Exception:
            db_user = None
            db_jobs, history, platform_data, recommendations = [], [], {"status": "no_data", "quiz": None, "labs": [], "certifications": []}, {"certifications": [], "labs": []}
    except Exception as e:
        logger.error(f"[chat] gather error: {e}")
        db_user, db_jobs, history, platform_data, recommendations = None, [], [], {"status": "no_data", "quiz": None, "labs": [], "certifications": []}, {"certifications": [], "labs": []}

    # ── Fallback : si DB vide, utiliser les jobs envoyés par le frontend ─────
    if not db_jobs and data.jobs_context:
        logger.info(f"[chat] DB empty — using {len(data.jobs_context)} jobs from frontend context")
        db_jobs = data.jobs_context

    nest_managed = data.chat_history is not None

    logger.info(
        f"[chat] uid={uid} lang={detected_lang} "
        f"db_user={'FOUND' if db_user else 'NOT_FOUND'} "
        f"jobs={len(db_jobs)} history={len(history)} "
        f"platform_labs={len(platform_data.get('labs', []))} platform_certs={len(platform_data.get('certifications', []))} "
        f"recommended_labs={len(recommendations.get('labs', []))} recommended_certs={len(recommendations.get('certifications', []))} "
        f"nest_managed={nest_managed} prep={time.time()-t0:.2f}s"
    )

    if uid > 0 and not nest_managed:
        asyncio.create_task(_safe_save_msg(uid, "user", data.message))

    # ── Construire le system prompt ───────────────────────────────────────────
    if detected_lang == "fr":
        lang_rule = (
            "\n\n[RÈGLE OBLIGATOIRE : Réponds UNIQUEMENT en français. "
            "L'utilisateur a écrit en français. N'utilise pas l'anglais.]"
        )
        lang_block = (
            "CRITIQUE — LANGUE : Tu DOIS répondre UNIQUEMENT en français. "
            "L'utilisateur a écrit en français. N'utilise pas l'anglais dans ta réponse.\n\n"
        )
    else:
        lang_rule = (
            "\n\n[MANDATORY RULE: Respond ONLY in English. "
            "The user wrote in English. Do not use French.]"
        )
        lang_block = (
            "CRITICAL — LANGUAGE: You MUST respond ONLY in English. "
            "The user wrote in English. Do not use French in your response.\n\n"
        )

    # FIX: _build_chat_system_prompt retourne toujours une str — plus de NoneType
    system_prompt = _build_chat_system_prompt(db_user, db_jobs, platform_data, recommendations)
    system_prompt = lang_block + system_prompt.rstrip()

    messages_payload = [{"role": "system", "content": system_prompt}]
    for h in history[-16:]:
        messages_payload.append({"role": h["role"], "content": h["content"]})
    messages_payload.append({
        "role": "user",
        "content": (data.message or "").strip() + lang_rule
    })

    # ── Appel Azure OpenAI ────────────────────────────────────────────────────
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
    response   = ""
    try:
        async with _azure_client() as az:
            resp = await az.chat.completions.create(
                model       = deployment,
                messages    = messages_payload,
                max_tokens  = 1500,
                temperature = 0.3,
            )
        response = resp.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"[chat] LLM error: {e}")
        response = f"⚠️ Erreur LLM : {str(e)}"

    if uid > 0 and response and not nest_managed:
        asyncio.create_task(_safe_save_msg(uid, "assistant", response))
        if len(history) >= 8:
            asyncio.create_task(_auto_summarize(uid, history, deployment))

    return {"response": response, "intent": "llm", "jobs_count": len(db_jobs)}


@chat_router.get("/api/chat/history")
async def api_chat_history(user_id: str = ""):
    """Retourne l'historique complet de chat d'un utilisateur depuis PostgreSQL."""
    if not user_id:
        return {"messages": []}
    try:
        msgs = await _load_chat_history(int(user_id))
    except Exception:
        msgs = []
    return {"messages": msgs}