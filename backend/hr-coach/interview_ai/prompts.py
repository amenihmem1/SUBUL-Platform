from __future__ import annotations

import random
import re
from typing import Any, Literal, TypedDict

from interview_ai.constants import (
    ENGLISH_MARKERS,
    FRENCH_MARKERS,
    GENERIC_PROJECT_FILTER,
    MAX_ANCHOR_LENGTH,
    MAX_CONTEXT_SNIPPET,
    MAX_LAST_ANSWER_FOCUS,
    MAX_PREVIEW_LENGTH,
)
# Types
Phase = Literal["INTRO", "BEHAVIOR", "SOFT", "MOTIVATION", "FINAL"]

class SkillEval(TypedDict):
    level: int
    evidence: str

class OutputJSON(TypedDict):
    phase: Phase
    question_index: int
    say: str
    skills: dict[str, SkillEval]
    score_partial: dict[str, int]
    notes: list[str]
    final_report: str | None

# Helpers généraux

def _clean_spaces(value: str | None) -> str:
    return " ".join((value or "").split()).strip()

def _matching_key(value: str | None) -> str:
    cleaned = _clean_spaces(value).lower()
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()

def _content_tokens(value: str | None) -> set[str]:
    return {
        token
        for token in re.findall(r"\b[\w'-]+\b", _matching_key(value))
        if len(token) > 3
    }

def _normalize_intro_headline(headline: str) -> str:
    cleaned = _clean_spaces(headline).strip(" ,;:.")
    if not cleaned:
        return ""

    lowered = cleaned.lower()
    if lowered.startswith(("recherche d'un poste", "recherche dâ€™un poste", "recherche de poste")):
        return f"a la {cleaned[0].lower() + cleaned[1:]}"
    if lowered.startswith(("a la recherche", "à la recherche")):
        return "a la recherche" + cleaned[len("a la recherche"):]
    if lowered.startswith("looking for "):
        return cleaned[0].lower() + cleaned[1:]
    return cleaned


def build_chat_messages(
    *,
    system_content: str,
    user_content: str,
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


INTRO_READY_MARKERS = {
    "je suis prete",
    "je suis prêt",
    "je suis pret",
    "prete",
    "prête",
    "pret",
    "prêt",
    "ready",
    "oui",
    "ok",
    "d'accord",
    "bonjour",
}


def _resolve_candidate_name(candidate_name: str, profile_name: str) -> str:
    cleaned_name = _clean_spaces(candidate_name)
    if cleaned_name.lower() in {"candidate", "candidat", "candidat inconnu", "unknown candidate"}:
        cleaned_name = ""
    return cleaned_name or _clean_spaces(profile_name)


def _normalize_intro_candidate_text(phase: Phase, text: str) -> str:
    if phase == "INTRO" and _clean_spaces(text).lower() in INTRO_READY_MARKERS:
        return ""
    return text

def _build_recent_history(
    recent_turns: list[dict[str, Any]],
    fallback_text: str,
) -> tuple[list[str], str]:
    history_lines: list[str] = []
    last_question = ""
    for turn in recent_turns[-4:]:
        if not isinstance(turn, dict):
            continue
        question = _clean_spaces(str(turn.get("say", "")))[:100]
        answer = _clean_spaces(str(turn.get("candidate_text", fallback_text) or ""))[:120]
        if question:
            last_question = question
        history_lines.append(f"Q: {question} -> R: {answer}")
    return history_lines, last_question


def _build_context_preview(rag_context: list[str]) -> str:
    return "\n".join(
        f"- {_clean_spaces(str(item))[:MAX_CONTEXT_SNIPPET]}"
        for item in rag_context[:2]
        if _clean_spaces(str(item))
    ) or "Aucun contexte supplÃ©mentaire"


def _build_generation_guidance(phase: Phase, behavior_anchor: str) -> str:
    if phase == "INTRO":
        return (
            "\nInstruction INTRO : commence par une courte formule de bienvenue "
            "ou de remerciement, puis pose une seule question d'ouverture."
        )

    if phase == "BEHAVIOR":
        if behavior_anchor:
            return (
                "\nInstruction BEHAVIOR : cite explicitement cette ancre du CV ou du contexte "
                f"dans la question si elle est pertinente : {behavior_anchor}\n"
                "N'utilise pas une formule vague comme 'sur l'un de vos projets'."
            )
        return (
            "\nInstruction BEHAVIOR : si aucune ancre projet fiable n'est disponible, "
            "reste neutre et demande un exemple concret sans inventer de projet."
        )

    return ""


def _build_example_json(phase: Phase, recent_turn_count: int) -> str:
    return (
        '{"phase":"' + phase + '","question_index":' + str(max(1, recent_turn_count + 1)) +
        ',"say":"' + ("" if phase == "FINAL" else "Question courte ?") +
        '","skills":{"communication":{"level":3,"evidence":"Ã©coute claire"},'
        '"teamwork":{"level":3,"evidence":"bonne collaboration"},'
        '"problem_solving":{"level":3,"evidence":"analyse structurÃ©e"},'
        '"motivation":{"level":3,"evidence":"intÃ©rÃªt cohÃ©rent"}},'
        '"score_partial":{"communication":3,"teamwork":3,"problem_solving":3,"motivation":3},'
        '"notes":[],"final_report":null}'
    )

# Détection langue

def detect_response_language(text: str | None) -> Literal["fr", "en"]:
    if not (text := (text or "").strip().lower()):
        return "fr"

    sample = f" {text} "
    fr_score = sum(1 for m in FRENCH_MARKERS if m in sample)
    en_score = sum(1 for m in ENGLISH_MARKERS if m in sample)
    return "en" if en_score > fr_score else "fr"

# Normalisation profil CV

def normalize_cv_profile(cv_profile: dict[str, Any] | Any) -> dict[str, Any]:
    """
    Harmonise les clés du profil CV pour le prompt RH.
    Accepte un dict brut ou un objet type CandidateInfo converti en dict.
    """
    if not cv_profile:
        return {}

    if hasattr(cv_profile, "_asdict"):
        cv_profile = cv_profile._asdict()
    elif hasattr(cv_profile, "__dict__") and not isinstance(cv_profile, dict):
        cv_profile = dict(cv_profile.__dict__)
    elif not isinstance(cv_profile, dict):
        return {}

    name = str(cv_profile.get("candidate_name") or cv_profile.get("name") or "").strip()
    if name.lower() in {
        "candidat inconnu",
        "candidate",
        "candidat",
        "unknown candidate",
    }:
        name = ""

    if not name:
        preview = str(cv_profile.get("text_preview") or "").strip()
        first_line = next((line.strip() for line in preview.splitlines() if line.strip()), "")
        if first_line and len(first_line) <= 40 and first_line == first_line.upper():
            upper_words = re.findall(r"[A-ZÀ-Ÿ][A-ZÀ-Ÿ'â€™-]{1,}", first_line)
            if 2 <= len(upper_words) <= 4:
                name = " ".join(word.capitalize() for word in upper_words)

    headline = _normalize_intro_headline(str(cv_profile.get("headline") or ""))

    return {
        "candidate_name": name,
        "name": name,
        "headline": headline,
        "email": str(cv_profile.get("email") or "").strip(),
        "phone": str(cv_profile.get("phone") or "").strip(),
        "linkedin": str(cv_profile.get("linkedin") or "").strip(),
        "github": str(cv_profile.get("github") or "").strip(),
        "top_skills": list(cv_profile.get("top_skills") or []),
        "experiences": list(cv_profile.get("experiences") or []),
        "projects": list(cv_profile.get("projects") or []),
        "confidence": dict(cv_profile.get("confidence") or {}),
        "overall_confidence": float(cv_profile.get("overall_confidence") or 0.0),
        "text_preview": str(cv_profile.get("text_preview") or "").strip(),
        "source_filename": str(cv_profile.get("source_filename") or "").strip(),
    }

# Helpers CV / contexte
def format_project_anchor(text: str | None) -> str:
    if not (text := _clean_spaces(text)):
        return ""

    lowered = text.lower()
    if any(marker in lowered for marker in GENERIC_PROJECT_FILTER):
        return ""

    text = re.sub(r"\b(19|20)\d{2}\s*[-/]\s*(19|20)?\d{2}\b", "", text).strip(" -|,;:")
    parts = [p.strip(" -|,;:") for p in re.split(r"\s*\|\s*", text) if p.strip(" -|,;:")]
    if not parts:
        return text[:MAX_ANCHOR_LENGTH]

    base = parts[0]
    if len(base) > 55 and len(parts) > 1:
        base = parts[1]

    if any(marker in base.lower() for marker in GENERIC_PROJECT_FILTER):
        return ""

    return base[:MAX_ANCHOR_LENGTH]


def build_cv_anchor_terms(
    cv_profile: dict[str, Any],
    rag_context: list[str] | None = None,
) -> list[str]:
    profile = normalize_cv_profile(cv_profile)
    anchors: list[str] = []
    seen: set[str] = set()

    def add_anchor(value: str) -> None:
        cleaned = _clean_spaces(value)
        if not cleaned:
            return
        key = cleaned.lower()
        if key in seen:
            return
        seen.add(key)
        anchors.append(cleaned)

    for item in (
        *[format_project_anchor(str(p)) for p in profile.get("projects", [])[:3]],
        profile.get("headline", ""),
        *profile.get("top_skills", [])[:5],
    ):
        add_anchor(str(item))

    for line in (rag_context or [])[:3]:
        cleaned = _clean_spaces(str(line))
        if cleaned:
            add_anchor(cleaned[:100])

    return anchors[:8]


def select_behavior_anchor(
    cv_profile: dict[str, Any],
    rag_context: list[str] | None = None,
    recent_turns: list[dict[str, Any]] | None = None,
    current_text: str = "",
    session_id: str = "",
) -> str:
    profile = normalize_cv_profile(cv_profile)
    project_candidates = [
        candidate
        for candidate in (format_project_anchor(str(project)) for project in profile.get("projects", [])[:6])
        if candidate
    ]
    candidates = project_candidates or build_cv_anchor_terms(profile, rag_context)
    if not candidates:
        return ""

    used_surface = " ".join(
        _clean_spaces(str(turn.get("say", "")))
        for turn in (recent_turns or [])
        if isinstance(turn, dict)
    )
    used_key = _matching_key(used_surface)
    unused_candidates = [
        candidate
        for candidate in candidates
        if _matching_key(candidate) not in used_key
    ]
    pool = unused_candidates or candidates

    seed_parts = [
        session_id,
        current_text,
        str(len(recent_turns or [])),
        "|".join(pool),
    ]
    rng = random.Random("::".join(seed_parts))
    return pool[rng.randrange(len(pool))]


def extract_relevant_phrase(text: str | None) -> str:
    cleaned = _clean_spaces(text)
    if not cleaned:
        return ""

    for sentence in re.split(r"[.!?;:\n]", cleaned):
        sentence = sentence.strip(" ,")
        if len(sentence) < 25:
            continue
        lowered = sentence.lower()
        if any(token in lowered for token in ("projet", "équipe", "equipe", "problème", "probleme", "collabor", "client", "blocage")):
            return sentence[:120].rsplit(" ", 1)[0].strip(" ,\"'") or sentence[:120].strip(" ,\"'")

    return cleaned[:120].rsplit(" ", 1)[0].strip(" ,\"'") or cleaned[:120].strip(" ,\"'")


def build_cv_summary(profile: dict[str, Any]) -> str:
    profile = normalize_cv_profile(profile)
    if not profile:
        return "Aucun profil CV disponible."

    name = str(profile.get("candidate_name", "")).strip() or "non précisé"
    headline = str(profile.get("headline", "")).strip() or "non précisé"
    skills = ", ".join(str(s).strip() for s in profile.get("top_skills", [])[:6] if str(s).strip()) or "non précisé"
    projects = " | ".join(str(p).strip() for p in profile.get("projects", [])[:3] if str(p).strip()) or "non précisé"
    preview = _clean_spaces(str(profile.get("text_preview", "")))[:MAX_PREVIEW_LENGTH] or "non précisé"

    return (
        f"Nom          : {name}\n"
        f"Profil       : {headline}\n"
        f"Compétences  : {skills}\n"
        f"Projets      : {projects}\n"
        f"Extrait CV   : {preview}"
    )


def normalize_cv_profile(cv_profile: dict[str, Any] | Any) -> dict[str, Any]:
    """
    Harmonise les cles du profil CV pour le prompt RH.
    Version etendue: conserve aussi les experiences extraites.
    """
    if not cv_profile:
        return {}

    if hasattr(cv_profile, "_asdict"):
        cv_profile = cv_profile._asdict()
    elif hasattr(cv_profile, "__dict__") and not isinstance(cv_profile, dict):
        cv_profile = dict(cv_profile.__dict__)
    elif not isinstance(cv_profile, dict):
        return {}

    name = str(cv_profile.get("candidate_name") or cv_profile.get("name") or "").strip()
    if name.lower() in {"candidat inconnu", "candidate", "candidat", "unknown candidate"}:
        name = ""

    if not name:
        preview = str(cv_profile.get("text_preview") or "").strip()
        first_line = next((line.strip() for line in preview.splitlines() if line.strip()), "")
        if first_line and len(first_line) <= 40 and first_line == first_line.upper():
            upper_words = re.findall(r"[A-ZÃ€-Å¸][A-ZÃ€-Å¸'Ã¢â‚¬â„¢-]{1,}", first_line)
            if 2 <= len(upper_words) <= 4:
                name = " ".join(word.capitalize() for word in upper_words)

    headline = _normalize_intro_headline(str(cv_profile.get("headline") or ""))

    return {
        "candidate_name": name,
        "name": name,
        "headline": headline,
        "email": str(cv_profile.get("email") or "").strip(),
        "phone": str(cv_profile.get("phone") or "").strip(),
        "linkedin": str(cv_profile.get("linkedin") or "").strip(),
        "github": str(cv_profile.get("github") or "").strip(),
        "top_skills": list(cv_profile.get("top_skills") or []),
        "experiences": list(cv_profile.get("experiences") or []),
        "projects": list(cv_profile.get("projects") or []),
        "confidence": dict(cv_profile.get("confidence") or {}),
        "overall_confidence": float(cv_profile.get("overall_confidence") or 0.0),
        "text_preview": str(cv_profile.get("text_preview") or "").strip(),
        "source_filename": str(cv_profile.get("source_filename") or "").strip(),
    }


def build_cv_summary(profile: dict[str, Any]) -> str:
    profile = normalize_cv_profile(profile)
    if not profile:
        return "Aucun profil CV disponible."

    name = str(profile.get("candidate_name", "")).strip() or "non precise"
    headline = str(profile.get("headline", "")).strip() or "non precise"
    skills = ", ".join(str(s).strip() for s in profile.get("top_skills", [])[:6] if str(s).strip()) or "non precise"
    experiences = " | ".join(
        str(item).strip() for item in profile.get("experiences", [])[:2] if str(item).strip()
    ) or "non precise"
    projects = " | ".join(str(p).strip() for p in profile.get("projects", [])[:3] if str(p).strip()) or "non precise"
    preview = _clean_spaces(str(profile.get("text_preview", "")))[:MAX_PREVIEW_LENGTH] or "non precise"

    return (
        f"Nom          : {name}\n"
        f"Profil       : {headline}\n"
        f"Competences  : {skills}\n"
        f"Experiences  : {experiences}\n"
        f"Projets      : {projects}\n"
        f"Extrait CV   : {preview}"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Prompt système refactorisé
# ──────────────────────────────────────────────────────────────────────────────

def build_system_prompt(
    cv_profile: dict[str, Any],
    phase: Phase,
    response_lang: Literal["fr", "en"] = "fr",
) -> str:
    profile = normalize_cv_profile(cv_profile)

    name = str(profile.get("candidate_name") or "").strip()
    headline = str(profile.get("headline") or "").strip()
    skills_str = ", ".join(profile.get("top_skills", [])[:5]) or "non précisé"

    prompt_name = name or "le candidat"
    headline_for_context = headline or "non précisé"
    lang_label = "anglais" if response_lang == "en" else "français"

    role_block = f"""
Tu es un recruteur RH senior, bienveillant, structuré et naturel.
Tu mènes un entretien 100 % RH et comportemental, jamais technique.

Contexte candidat :
- Nom : {prompt_name}
- Profil : {headline_for_context}
- Compétences observées : {skills_str}
- Langue de "say" : {lang_label}
""".strip()

    json_block = """
CONTRAT DE SORTIE
Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte hors JSON.

Clés obligatoires :
- phase
- question_index
- say
- skills
- score_partial
- notes
- final_report

Contraintes :
- phase FINAL -> "say" = ""
- autres phases -> "say" = une seule question naturelle finissant par "?"
- final_report = null tant que phase != FINAL
- skills contient exactement :
  communication, teamwork, problem_solving, motivation
- chaque skill contient :
  level, evidence
- notes = [] ou max 2 éléments courts
""".strip()

    global_rules_block = """
RÈGLES GLOBALES
1. Ne jamais poser de question technique.
2. Ne jamais inventer un projet, un conflit, un outil ou une situation.
3. Toujours se baser sur le CV, la dernière réponse.
4. Ne jamais répéter une question déjà posée.
5. Hors INTRO, ne jamais refaire une salutation.
6. Hors INTRO, ne jamais répéter le nom du candidat ni écrire "Vous êtes..." / "You are...".
7. Question courte, naturelle, conversationnelle.
8. Une seule vraie question à la fois.
9. Focus exclusif :
   communication, collaboration, gestion du stress, priorités,
   autonomie, motivation, recul, apprentissage, posture professionnelle.
10. Si le headline est absent ou flou, ne pas l’inventer.
11. En INTRO, rester large ; hors INTRO, rester ciblé.
""".strip()

    scoring_block = """
SCORES ET SKILLS
- Le scoring detaille est calcule par un tool separe.
- Pour cette generation, conserve un JSON valide avec les cles skills et score_partial.
- Si tu n'es pas en phase FINAL, laisse skills a 0 avec evidence courte ou vide.
- Si tu n'es pas en phase FINAL, laisse score_partial a 0 partout.
- notes = tres courtes.
""".strip()

    phase_rules = {
       "INTRO": """
RÈGLES DE PHASE : INTRO
- Faire une ouverture chaleureuse, simple et professionnelle.
- Commencer par un court message de bienvenue ou de remerciement.
- Le champ "say" peut contenir une courte phrase d’accueil suivie d’une seule question d’ouverture.
- Utiliser le nom seulement s’il est fiable.
- Utiliser le headline seulement s’il est fiable.
- Si le headline est absent, ne pas l’inventer.
- Poser une seule question large sur le parcours professionnel.
- Ne pas entrer dans un projet précis.
- Ne pas poser de question comportementale ou technique à ce stade.
""".strip(),

        "BEHAVIOR": """
RÈGLES DE PHASE : BEHAVIOR
- Poser une seule question.
- Demander un exemple concret réellement vécu.
- Explorer une situation réelle : désaccord, pression, arbitrage, collaboration difficile,
  besoin de convaincre, difficulté relationnelle, échec ou tension.
- Rester neutre : ne pas supposer qu’un conflit a forcément existé.
- Pour la première question BEHAVIOR, citer explicitement un projet, stage, mission
  ou expérience précise issu(e) du CV quand cette ancre existe.
- Éviter absolument les formulations génériques du type :
  "Sur l’un de vos projets..."
- Ancrer si possible la question sur un projet ou une expérience mentionnée.
- Préférer des formulations comme :
  "Avez-vous un exemple concret de... ?"
  "Lors de votre projet X, ... ?"
- Éviter les questions doubles.
""".strip(),
          "SOFT": """
RÈGLES DE PHASE : SOFT
- Creuser uniquement l’exemple déjà évoqué.
- Poser une seule question.
- Changer d’angle : communication, émotions, stress, apprentissage, recul, posture.
- Ne jamais revenir à la technique.
- La relance doit paraître humaine, progressive et naturelle.
- Ne pas introduire un nouveau scénario.
- S’appuyer sur la réponse précédente du candidat.
""".strip(),

         "MOTIVATION": """
RÈGLES DE PHASE : MOTIVATION
- Explorer uniquement : envie de rejoindre ce poste, critères de choix,
  projection professionnelle, attentes pour les prochaines années.
- Ne pas revenir sur un conflit passé.
- Poser une seule question.
- Chercher une motivation réelle, concrète et cohérente avec le poste visé.
- Si pertinent, relier la motivation à l’entreprise ou au type de mission.
""".strip(),

        "FINAL": """
RÈGLES DE PHASE : FINAL
- "say" = ""
- final_report doit contenir :
  synthèse_motivation,
  points_forts_RH,
  points_de_vigilance,
  fit_culturel,
  recommandation_finale
- Le ton doit rester neutre, professionnel et synthétique.
- La recommandation finale doit être courte et justifiée.
""".strip(),
    }
    return "\n\n".join([
        role_block,
        json_block,
        global_rules_block,
        scoring_block,
        phase_rules.get(phase, phase_rules["BEHAVIOR"]),
    ])

# Construction des messages LLM

def build_generation_messages(
    *,
    session_id: str,
    candidate_name: str,
    phase: Phase,
    lang: Literal["fr", "en"],
    text: str,
    recent_turns: list[dict[str, Any]],
    cv_profile: dict[str, Any],
    rag_context: list[str],
) -> list[dict[str, str]]:
    profile = normalize_cv_profile(cv_profile)

    profile_name = str(profile.get("candidate_name", "")).strip()
    profile_headline = str(profile.get("headline", "")).strip()

    candidate_name = _resolve_candidate_name(candidate_name, profile_name)

    text = _normalize_intro_candidate_text(phase, text)

    history_lines, last_question = _build_recent_history(recent_turns, text)

    cv_summary = build_cv_summary(profile)
    anchors = build_cv_anchor_terms(profile, rag_context)
    behavior_anchor = select_behavior_anchor(
        profile,
        rag_context=rag_context,
        recent_turns=recent_turns,
        current_text=text,
        session_id=session_id,
    )
    if behavior_anchor:
        anchors = [behavior_anchor, *[anchor for anchor in anchors if anchor.lower() != behavior_anchor.lower()]]
    history_str = "\n".join(history_lines) or "Aucun historique"
    focus = extract_relevant_phrase(text) or _clean_spaces(text)[:MAX_LAST_ANSWER_FOCUS] or "Aucune réponse exploitable"
    context_str = _build_context_preview(rag_context)

    phase_guidance = _build_generation_guidance(phase, behavior_anchor)
    example_json = _build_example_json(phase, len(recent_turns))

    user_content = f"""Phase cible : {phase}
Langue attendue pour "say" : {"anglais" if lang == "en" else "français"}
Session : {session_id}

Nom candidat : {candidate_name or "non précisé"}
Headline CV : {profile_headline or "absent"}

Dernière réponse du candidat :
{text.strip()[:350] or "Aucune réponse exploitable"}

Point saillant :
{focus}

Dernière question :
{last_question or "Aucune"}

Profil CV :
{cv_summary}

Historique récent :
{history_str}

Contexte RAG utile :
{context_str}

Ancres utiles :
{", ".join(anchors[:4]) if anchors else "Aucune"}

Ancre BEHAVIOR prioritaire :
{behavior_anchor or "Aucune"}

Instruction :
Produis la prochaine sortie JSON en respectant strictement la phase cible.
Base-toi sur le CV, la dernière réponse .
Ne répète pas une question déjà posée.
N’invente aucun projet, conflit, outil ou situation.
{phase_guidance}

Exemple de structure valide :
{example_json}
"""
    return build_chat_messages(
        system_content=build_system_prompt(profile, phase, lang),
        user_content=user_content,
    )

def build_rephrase_messages(
    *,
    session_id: str,
    candidate_name: str,
    phase: Phase,
    lang: Literal["fr", "en"],
    clarification_text: str,
    original_question: str,
    question_index: int,
    recent_turns: list[dict[str, Any]],
    cv_profile: dict[str, Any],
    rag_context: list[str],
) -> list[dict[str, str]]:
    profile = normalize_cv_profile(cv_profile)
    profile_name = str(profile.get("candidate_name", "")).strip()
    profile_headline = str(profile.get("headline", "")).strip()
    candidate_name = _resolve_candidate_name(candidate_name, profile_name)
    anchors = build_cv_anchor_terms(profile, rag_context)
    history_lines, _last_question = _build_recent_history(recent_turns, clarification_text)
    history_str = "\n".join(history_lines) or "Aucun historique"
    context_str = _build_context_preview(rag_context)
    cv_summary = build_cv_summary(profile)

    system_content = "\n\n".join(
        [
            build_system_prompt(profile, phase, lang),
            (
                "MODE REFORMULATION\n"
                "Le candidat n'a pas compris la derniere question.\n"
                "Reformule exactement la meme intention en plus simple, plus claire et plus courte.\n"
                "Ne change pas de phase, ne change pas de sujet, n'ajoute aucun nouveau projet, outil ou contexte.\n"
                "Si la question originale contient une ancre CV utile, conserve-la.\n"
                "Retourne un JSON valide avec le meme schema.\n"
                "La nouvelle question doit rester naturelle et se terminer par '?'.\n"
                "score_partial doit rester a 0 partout, skills a 0 partout, final_report = null."
            ),
        ]
    )

    example_json = (
        '{"phase":"' + phase + '","question_index":' + str(question_index) +
        ',"say":"Question reformulee plus simplement ?","skills":{"communication":{"level":0,"evidence":""},'
        '"teamwork":{"level":0,"evidence":""},"problem_solving":{"level":0,"evidence":""},'
        '"motivation":{"level":0,"evidence":""}},"score_partial":{"communication":0,"teamwork":0,'
        '"problem_solving":0,"motivation":0},"notes":["reformulation"],"final_report":null}'
    )

    user_content = f"""Phase a conserver : {phase}
Langue attendue pour "say" : {"anglais" if lang == "en" else "franÃ§ais"}
Session : {session_id}
Question index a conserver : {question_index}

Nom candidat : {candidate_name or "non prÃ©cisÃ©"}
Headline CV : {profile_headline or "absent"}

Derniere question posee :
{original_question.strip() or "Aucune"}

Demande du candidat :
{clarification_text.strip()[:200] or "Le candidat demande une reformulation"}

Profil CV :
{cv_summary}

Historique recent :
{history_str}

Contexte RAG utile :
{context_str}

Ancres utiles :
{", ".join(anchors[:4]) if anchors else "Aucune"}

Instruction :
Reformule uniquement la derniere question en plus simple.
Ne passe surtout pas a une autre phase.
Ne pose pas une nouvelle question differente.
Ne fais aucun scoring.

Exemple de structure valide :
{example_json}
"""

    return build_chat_messages(
        system_content=system_content,
        user_content=user_content,
    )

# Réparation / retry prompt

def build_repair_instruction(failure_reason: str) -> tuple[str, float]:
    contract = (
        "Retourne UNIQUEMENT un JSON valide avec les clefs : "
        "phase, question_index, say, skills, score_partial, notes, final_report. "
        "skills = {communication, teamwork, problem_solving, motivation} avec level + evidence. "
        "score_partial = mêmes clefs. final_report = null sauf en FINAL."
    )

    reason = failure_reason.lower()

    if "score" in reason and "vide" in reason:
        return (
            "Les scores et/ou skills sont incorrects ou à zéro partout. "
            "Réévalue la réponse du candidat et attribue des scores cohérents. "
            "Dès qu’il y a un exemple concret, évite de rester à 0. "
            + contract,
            0.25,
        )

    if "say" in reason and ("vide" in reason or "invalide" in reason):
        return (
            "'say' est vide ou invalide. Génère UNE SEULE question RH claire, naturelle et finissant par '?'. "
            "Ne répète pas une ancienne question. "
            + contract,
            0.25,
        )

    if "répét" in reason or "repete" in reason:
        return (
            "La question est trop similaire à une précédente. "
            "Propose une nouvelle question qui creuse un angle différent. "
            + contract,
            0.30,
        )

    if "incomplete" in reason:
        return (
            "La question est tronquée ou incomplète. "
            "Régénère UNE question RH complète, autonome, naturelle et finissant par '?'. "
            + contract,
            0.20,
        )

    if "multipl" in reason:
        return (
            "La question contient plusieurs demandes. "
            "Reformule en UNE seule question courte et focalisée. "
            + contract,
            0.20,
        )

    if "intro" in reason and "invalide" in reason:
        return (
            "Question INTRO invalide. Pose une question d’ouverture large et naturelle sur le parcours "
            "ou ce qui motive la personne dans son travail, sans détailler un projet. "
            + contract,
            0.20,
        )

    if "soft" in reason and "invalide" in reason:
        return (
            "Question SOFT invalide. Ne redemande pas comment le problème a été résolu. "
            "Change d’angle : communication, apprentissage, posture, émotions ou stress. "
            + contract,
            0.25,
        )

    if "behavior" in reason and "affirmative" in reason:
        return (
            "Question BEHAVIOR trop affirmative. "
            "Demande une situation ou un exemple vécu sans supposer que le conflit a déjà existé. "
            "Utilise une forme neutre comme 'Avez-vous un exemple concret de... ?'. "
            + contract,
            0.25,
        )

    if "behavior" in reason and "detaillee" in reason:
        return (
            "Question BEHAVIOR trop détaillée trop tôt. "
            "Repars d’un projet ou d’une expérience et demande un défi, un blocage "
            "ou une situation concrète, sans zoom technique. "
            + contract,
            0.20,
        )

    if "behavior" in reason and "generique" in reason:
        return (
            "Question BEHAVIOR trop générique. "
            "Si le CV contient un projet, un stage, une mission ou une expérience précise, "
            "cite explicitement cette ancre dans la question au lieu de dire 'sur l'un de vos projets'. "
            + contract,
            0.20,
        )

    if "hors contexte" in reason:
        return (
            "La question introduit une ancre absente du CV ou de la dernière réponse. "
            "Reformule en restant strictement fidèle au contexte fourni. "
            + contract,
            0.20,
        )

    if "motivation" in reason and "invalide" in reason:
        return (
            "Question MOTIVATION invalide. Elle doit porter uniquement sur l’envie de rejoindre "
            "le poste, l’entreprise, les critères de choix ou la projection professionnelle. "
            + contract,
            0.25,
        )

    return (
        "La réponse précédente n’est pas conforme. "
        "Corrige-la en respectant strictement le contrat JSON. "
        "Conserve la phase cible et fournis une question valide dans 'say' si phase != FINAL. "
        + contract,
        0.20,
    )
