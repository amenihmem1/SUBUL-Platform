from __future__ import annotations

import unicodedata
import re
from typing import Any, Callable

from interview_ai.prompts import build_chat_messages, build_cv_summary


RequestJsonFn = Callable[..., dict[str, Any]]

ENGLISH_HINTS = (
    "candidate ",
    "shows ",
    "moderate ",
    "focus on ",
    "encourage ",
    "maintain ",
    "practice ",
    "expertise",
    "delivery",
    "collaboration",
    "clarity",
    "depth",
    "articulation",
    "problem solving",
    "team ",
)
FRENCH_HINTS = (" candidat", " montre", " communication", " motivation", " entretien", " recommande", " conseil")
TRIVIAL_LAUNCH_MESSAGES = {
    "je suis prete",
    "je suis pret",
    "je suis prete de commencer",
    "je suis pret de commencer",
    "prete",
    "pret",
    "prete de commencer",
    "pret de commencer",
    "ready",
    "ready to start",
    "i am ready",
    "i am ready to start",
    "im ready",
    "im ready to start",
    "oui",
    "ok",
    "d accord",
    "bonjour",
}

COMPETENCY_KEYS = ("communication", "teamwork", "problem_solving", "motivation")
COMPETENCY_LABELS = {
    "fr": {
        "communication": "communication",
        "teamwork": "collaboration",
        "problem_solving": "resolution de problemes",
        "motivation": "motivation",
    },
    "en": {
        "communication": "communication",
        "teamwork": "teamwork",
        "problem_solving": "problem solving",
        "motivation": "motivation",
    },
}


def _looks_like_wrong_language(text: str, response_language: str) -> bool:
    lowered = f" {str(text or '').strip().lower()} "
    if not lowered.strip():
        return True
    if response_language == "fr":
        en_hits = sum(1 for marker in ENGLISH_HINTS if marker in lowered)
        fr_hits = sum(1 for marker in FRENCH_HINTS if marker in lowered)
        return en_hits > fr_hits
    return False


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("’", "'").replace("'", " ")
    return " ".join(normalized.lower().split()).strip()


def _is_trivial_launch_message(text: str) -> bool:
    return _normalize_text(text) in TRIVIAL_LAUNCH_MESSAGES


def _fallback_summary(
    *,
    response_language: str,
    strengths: list[str],
    improvement_points: list[str],
) -> str:
    if response_language == "en":
        strengths_part = strengths[0] if strengths else "The candidate shows a usable technical base."
        improvement_part = improvement_points[0] if improvement_points else "Further assessment may help refine the HR evaluation."
        return f"{strengths_part} {improvement_part}"

    strengths_part = strengths[0] if strengths else "Le candidat montre une base technique exploitable."
    improvement_part = improvement_points[0] if improvement_points else "Un entretien complementaire permettrait d'affiner l'evaluation RH."
    return f"{strengths_part} {improvement_part}"


def _is_fragment(text: str) -> bool:
    words = re.findall(r"\b[\w'-]+\b", str(text or ""), flags=re.UNICODE)
    return len(words) < 5


def _build_contextual_summary(
    *,
    response_language: str,
    competencies: dict[str, int],
    cv_profile: dict[str, Any],
) -> str:
    candidate_name = str(cv_profile.get("candidate_name") or cv_profile.get("name") or "").strip()
    top_skills = [str(item).strip() for item in (cv_profile.get("top_skills") or []) if str(item).strip()]
    ranked = sorted(competencies.items(), key=lambda item: (-int(item[1] or 0), item[0]))
    best_key, best_value = ranked[0] if ranked else ("communication", 0)
    weak_key, weak_value = sorted(competencies.items(), key=lambda item: (int(item[1] or 0), item[0]))[0] if competencies else ("communication", 0)

    if response_language == "en":
        subject = candidate_name or "The candidate"
        skills_text = f" and a background in {', '.join(top_skills[:3])}" if top_skills else ""
        return (
            f"{subject} shows a usable technical profile{skills_text}. "
            f"The strongest observed area is {best_key.replace('_', ' ')} ({best_value}/5). "
            f"The report should further confirm {weak_key.replace('_', ' ')} ({weak_value}/5) with more concrete examples."
        )

    subject = candidate_name or "Le candidat"
    skills_text = f" et une base sur {', '.join(top_skills[:3])}" if top_skills else ""
    return (
        f"{subject} presente un profil technique exploitable{skills_text}. "
        f"La competence la plus visible pendant l'entretien est {best_key.replace('_', ' ')} ({best_value}/5). "
        f"L'evaluation doit approfondir {weak_key.replace('_', ' ')} ({weak_value}/5) avec des exemples plus concrets."
    )


def _fallback_advice(response_language: str) -> list[str]:
    if response_language == "en":
        return [
            "Use more concise and structured examples.",
            "Link each answer to a concrete impact or outcome.",
        ]
    return [
        "Donner des exemples plus concis et structures.",
        "Relier chaque reponse a un impact ou un resultat concret.",
    ]


def _normalize_advice_item(item: str, response_language: str) -> str:
    text = str(item or "").strip()
    if not text:
        return ""

    if response_language == "fr":
        lowered = text.lower()
        direct_patterns = [
            (r"^encourager le candidat\s+[aà]\s+(.+)$", "Nous vous conseillons de {body}"),
            (r"^inciter le candidat\s+[aà]\s+(.+)$", "Nous vous conseillons de {body}"),
            (r"^sugg[ée]rer\s+(.+)$", "Pensez a {body}"),
            (r"^proposer\s+(.+)$", "Pensez a {body}"),
        ]
        for pattern, template in direct_patterns:
            match = re.match(pattern, lowered, flags=re.IGNORECASE)
            if match:
                body = match.group(1).strip(" .;:")
                text = template.format(body=body)
                break

    else:
        lowered = text.lower()
        direct_patterns = [
            (r"^encourage the candidate to\s+(.+)$", "We recommend that you {body}"),
            (r"^suggest\s+(.+)$", "Consider {body}"),
            (r"^propose\s+(.+)$", "Consider {body}"),
        ]
        for pattern, template in direct_patterns:
            match = re.match(pattern, lowered, flags=re.IGNORECASE)
            if match:
                body = match.group(1).strip(" .;:")
                text = template.format(body=body)
                break

    text = text.strip()
    if text and text[-1] not in ".!?":
        text += "."
    return text[:1].upper() + text[1:] if text else ""


def _normalize_report_item(item: str, response_language: str = "fr") -> str:
    text = str(item or "").strip()
    if not text:
        return ""
    if text and text[-1] not in ".!?":
        text += "."
    return text[:1].upper() + text[1:] if text else ""


def _competency_score(competencies: dict[str, int], key: str) -> int:
    try:
        value = int(competencies.get(key, 0) or 0)
    except Exception:
        value = 0
    return max(0, min(5, value))


def _complete_dimension_signal(*, competencies: dict[str, int], key: str, response_language: str) -> str:
    score = _competency_score(competencies, key)
    label = COMPETENCY_LABELS.get(response_language, COMPETENCY_LABELS["fr"]).get(key, key.replace("_", " "))
    if response_language == "en":
        if score >= 4:
            return f"The interview shows a solid level in {label}, supported by clear and usable examples."
        if score >= 3:
            return f"The interview shows a readable but still improvable level in {label}."
        if score > 0:
            return f"The interview gives limited evidence in {label}, requiring more concrete examples."
        return f"The interview does not yet provide enough evidence to assess {label} reliably."

    if score >= 4:
        return f"L'entretien montre un niveau solide en {label}, appuye par des exemples exploitables."
    if score >= 3:
        return f"L'entretien montre un niveau lisible mais encore perfectible en {label}."
    if score > 0:
        return f"L'entretien donne peu d'elements concrets sur la dimension {label}."
    return f"L'entretien ne fournit pas encore assez d'elements pour evaluer clairement la dimension {label}."


def _complete_dimension_action(*, competencies: dict[str, int], key: str, response_language: str) -> str:
    score = _competency_score(competencies, key)
    if response_language == "en":
        if key == "communication":
            return (
                "Maintain concise answers with one clear context, action, and measurable result."
                if score >= 4
                else "Structure each answer with context, action, result, and a short business impact."
            )
        if key == "teamwork":
            return (
                "Keep highlighting your role in collective decisions and shared delivery."
                if score >= 4
                else "Prepare one example showing your role, coordination, and contribution inside a team."
            )
        if key == "problem_solving":
            return (
                "Continue explaining your reasoning path and the trade-offs behind each solution."
                if score >= 4
                else "Use a concrete case to explain the problem, options considered, decision, and outcome."
            )
        return (
            "Keep connecting your motivation to the role's missions and long-term contribution."
            if score >= 4
            else "Clarify why this role fits your goals, strengths, and preferred work environment."
        )

    if key == "communication":
        return (
            "Conserver des reponses concises avec un contexte, une action et un resultat mesurable."
            if score >= 4
            else "Structurer chaque reponse avec le contexte, l'action menee, le resultat et l'impact."
        )
    if key == "teamwork":
        return (
            "Continuer a montrer votre role dans les decisions collectives et la livraison commune."
            if score >= 4
            else "Preparer un exemple montrant votre role, la coordination et votre contribution en equipe."
        )
    if key == "problem_solving":
        return (
            "Continuer a expliciter votre raisonnement et les arbitrages derriere chaque solution."
            if score >= 4
            else "Utiliser un cas concret pour expliquer le probleme, les options, la decision et le resultat."
        )
    return (
        "Continuer a relier votre motivation aux missions du poste et a votre contribution future."
        if score >= 4
        else "Clarifier pourquoi ce poste correspond a vos objectifs, vos forces et votre environnement ideal."
    )


def _complete_dimension_map(
    raw_items: dict[str, Any],
    *,
    competencies: dict[str, int],
    response_language: str,
    kind: str,
) -> dict[str, str]:
    completed: dict[str, str] = {}
    for key in COMPETENCY_KEYS:
        raw_value = str(raw_items.get(key, "") if isinstance(raw_items, dict) else "").strip()
        normalizer = _normalize_advice_item if kind == "action" else _normalize_report_item
        value = normalizer(raw_value, response_language) if raw_value else ""
        if value and not _looks_like_wrong_language(value, response_language) and not _is_fragment(value):
            completed[key] = value
            continue
        completed[key] = (
            _complete_dimension_action(competencies=competencies, key=key, response_language=response_language)
            if kind == "action"
            else _complete_dimension_signal(competencies=competencies, key=key, response_language=response_language)
        )
    return completed


def generate_final_report_text(
    *,
    request_json: RequestJsonFn,
    competencies: dict[str, int],
    strengths: list[str],
    improvement_points: list[str],
    visual_context: dict[str, Any],
    audio_context: dict[str, Any],
    cv_profile: dict[str, Any],
    turns: list[dict[str, Any]],
    response_language: str = "fr",
) -> dict[str, Any]:
    history_lines: list[str] = []
    for turn in turns[-6:]:
        if not isinstance(turn, dict):
            continue
        question = str(turn.get("say", "")).strip()[:140]
        answer = str(turn.get("candidate_text", "")).strip()[:220]
        if _is_trivial_launch_message(answer):
            continue
        if question or answer:
            history_lines.append(f"Q: {question} -> R: {answer}")

    resolved_visual_context = visual_context if isinstance(visual_context, dict) else {}
    visual_metrics = resolved_visual_context.get("metrics") or {}
    visual_signals = resolved_visual_context.get("signals") or []
    heuristic_flags = resolved_visual_context.get("heuristic_flags") or []
    confidence_note = str(resolved_visual_context.get("confidence_note", "") or "").strip()
    resolved_audio_context = audio_context if isinstance(audio_context, dict) else {}
    audio_metrics = resolved_audio_context.get("metrics") or {}
    audio_signals = resolved_audio_context.get("signals") or []
    audio_flags = resolved_audio_context.get("heuristic_flags") or []
    audio_confidence_note = str(resolved_audio_context.get("confidence_note", "") or "").strip()

    if response_language == "en":
        history_text = "\n".join(history_lines) if history_lines else "No usable interview history"
        cv_summary = build_cv_summary(cv_profile) if isinstance(cv_profile, dict) else "Detailed CV profile unavailable."
        system = (
            "You are a senior HR recruiter. "
            "Use competency scores, CV context, and interview excerpts to write a short HR report. "
            "Do not include visual, vocal, or emotional insight signals in this final HR summary. "
            "Those signals belong to a separate insights section and must stay out of the synthesis. "
            "Reply ONLY with a valid JSON object."
        )
        user = (
            "Generate a final HR interview report with this structure:\n"
            '- "summary": 3 to 5 sentences in English.\n'
            '- "strengths": an array of 2 to 3 tailored strengths.\n'
            '- "improvement_points": an array of 2 to 3 tailored development areas.\n'
            '- "advice": an array of 2 to 3 practical interview tips.\n\n'
            '- "dimension_signals": an object with the keys "communication", "teamwork", "problem_solving", and "motivation", each containing one key observed signal for the table.\n'
            '- "dimension_actions": an object with the keys "communication", "teamwork", "problem_solving", and "motivation", each containing one tailored recommended action.\n\n'
            "Rules:\n"
            "- Base the summary, strengths, improvement_points, and advice only on the CV, the interview content, and the competency scores.\n"
            "- Do not mention visual, vocal, emotional, stress, posture, or face-analysis cues in the summary or advice.\n"
            "- Write the advice directly to the candidate, using 'you', not 'the candidate'.\n"
            "- Write strengths and improvement_points in recruiter language, tailored to this candidate.\n"
            "- Do not use labels or fragments such as 'React expertise' or 'Communication clarity'; every list item must be a complete sentence of at least 6 words.\n"
            "- Each dimension signal must describe what was observed for that exact competency, not a generic strength.\n"
            "- Each dimension action must match the corresponding competency and remain specific, practical, and personalized to this candidate.\n"
            "- Advice must be practical, clear, and directly actionable.\n\n"
            "Context:\n"
            f"- Competency scores: {competencies}\n"
            f"CV summary:\n{cv_summary}\n\n"
            f"Interview excerpts:\n{history_text}\n\n"
            'Return ONLY JSON in the form {"summary":"...","strengths":["..."],"improvement_points":["..."],"advice":["..."],"dimension_signals":{"communication":"...","teamwork":"...","problem_solving":"...","motivation":"..."},"dimension_actions":{"communication":"...","teamwork":"...","problem_solving":"...","motivation":"..."}}.'
        )
    else:
        history_text = "\n".join(history_lines) if history_lines else "Aucun historique exploitable"
        cv_summary = build_cv_summary(cv_profile) if isinstance(cv_profile, dict) else "Profil CV non disponible en detail."
        system = (
            "Tu es un recruteur RH senior. "
            "A partir des scores, du CV et d'extraits d'entretien, redige un court rapport RH nuance et prudent. "
            "N'inclus jamais les signaux visuels, vocaux ou emotionnels dans cette synthese RH finale. "
            "Ces signaux appartiennent a une section insights separee et doivent rester hors du rapport de synthese. "
            "Reponds UNIQUEMENT avec un objet JSON valide."
        )
        user = (
            "Genere un rapport final d'entretien RH avec cette structure :\n"
            '- "summary": 3 a 5 phrases en francais.\n'
            '- "strengths": un tableau de 2 a 3 points forts personnalises.\n'
            "- \"improvement_points\": un tableau de 2 a 3 axes d'amelioration personnalises.\n"
            '- "advice": un tableau de 2 a 3 conseils pratiques.\n\n'
            '- "dimension_signals": un objet avec les cles "communication", "teamwork", "problem_solving" et "motivation", contenant pour chacune un signal cle observe pour le tableau.\n'
            '- "dimension_actions": un objet avec les cles "communication", "teamwork", "problem_solving" et "motivation", contenant pour chacune une action recommandee personnalisee.\n\n'
            "Regles:\n"
            "- Base la synthese, les strengths, les improvement_points et les conseils uniquement sur le CV, le contenu de l'entretien et les scores de competences.\n"
            "- Ne mentionne pas les signaux visuels, vocaux, emotionnels, le stress, la posture ou l'analyse du visage dans la synthese ni dans les conseils.\n"
            "- Redige les conseils en parlant directement au candidat avec 'vous', jamais avec 'le candidat'.\n"
            "- Redige les strengths et improvement_points comme un recruteur RH, de maniere personnalisee pour ce candidat.\n"
            "- N'utilise pas de libelles ou fragments comme 'React expertise' ou 'Communication clarity' ; chaque element doit etre une phrase complete d'au moins 6 mots.\n"
            "- Chaque signal par dimension doit decrire ce qui est observe pour cette competence precise, pas un point fort generique.\n"
            "- Chaque action par dimension doit correspondre a la competence concernee et rester concrete, utile et personnalisee pour ce candidat.\n"
            "- Les conseils doivent etre pratiques, clairs et actionnables.\n\n"
            "Contexte :\n"
            f"- Scores par competence: {competencies}\n"
            f"Resume CV:\n{cv_summary}\n\n"
            f"Extraits d'entretien:\n{history_text}\n\n"
            'Reponds UNIQUEMENT avec un JSON de la forme {"summary":"...","strengths":["..."],"improvement_points":["..."],"advice":["..."],"dimension_signals":{"communication":"...","teamwork":"...","problem_solving":"...","motivation":"..."},"dimension_actions":{"communication":"...","teamwork":"...","problem_solving":"...","motivation":"..."}}.'
        )

    parsed = request_json(
        messages=build_chat_messages(
            system_content=system,
            user_content=user,
        ),
        max_tokens=420,
        temperature=0.25,
        log_mode="final_report_prompt_json",
        phase="FINAL",
    )
    summary = str(parsed.get("summary", "") or "").strip()
    llm_strengths = [_normalize_report_item(str(item), response_language) for item in (parsed.get("strengths") or []) if str(item).strip()]
    llm_strengths = [item for item in llm_strengths if item]
    llm_improvement_points = [
        _normalize_report_item(str(item), response_language)
        for item in (parsed.get("improvement_points") or [])
        if str(item).strip()
    ]
    llm_improvement_points = [item for item in llm_improvement_points if item]
    raw_dimension_actions = parsed.get("dimension_actions") if isinstance(parsed.get("dimension_actions"), dict) else {}
    raw_dimension_signals = parsed.get("dimension_signals") if isinstance(parsed.get("dimension_signals"), dict) else {}
    llm_dimension_signals = _complete_dimension_map(
        raw_dimension_signals,
        competencies=competencies,
        response_language=response_language,
        kind="signal",
    )
    llm_dimension_actions = _complete_dimension_map(
        raw_dimension_actions,
        competencies=competencies,
        response_language=response_language,
        kind="action",
    )
    advice = [_normalize_advice_item(str(item), response_language) for item in (parsed.get("advice") or []) if str(item).strip()]
    advice = [item for item in advice if item]

    report_texts = [summary, *llm_strengths, *llm_improvement_points, *advice]
    has_fragments = any(_is_fragment(item) for item in [*llm_strengths, *llm_improvement_points, *advice])

    if _looks_like_wrong_language(summary, response_language) or any(
        _looks_like_wrong_language(item, response_language) for item in report_texts
    ) or has_fragments:
        parsed = request_json(
            messages=build_chat_messages(
                system_content=system,
                user_content=(
                    f"{user}\n\n"
                    f"Correction stricte : la reponse doit etre entierement en "
                    f"{'anglais' if response_language == 'en' else 'francais'}. "
                    "Tous les elements de liste doivent etre des phrases completes, personnalisees, sans fragments ni titres de section."
                ),
            ),
            max_tokens=420,
            temperature=0.15,
            log_mode="final_report_prompt_json_retry_language",
            phase="FINAL",
        )
        summary = str(parsed.get("summary", "") or "").strip()
        llm_strengths = [_normalize_report_item(str(item), response_language) for item in (parsed.get("strengths") or []) if str(item).strip()]
        llm_strengths = [item for item in llm_strengths if item]
        llm_improvement_points = [
            _normalize_report_item(str(item), response_language)
            for item in (parsed.get("improvement_points") or [])
            if str(item).strip()
        ]
        llm_improvement_points = [item for item in llm_improvement_points if item]
        raw_dimension_actions = parsed.get("dimension_actions") if isinstance(parsed.get("dimension_actions"), dict) else {}
        raw_dimension_signals = parsed.get("dimension_signals") if isinstance(parsed.get("dimension_signals"), dict) else {}
        llm_dimension_signals = _complete_dimension_map(
            raw_dimension_signals,
            competencies=competencies,
            response_language=response_language,
            kind="signal",
        )
        llm_dimension_actions = _complete_dimension_map(
            raw_dimension_actions,
            competencies=competencies,
            response_language=response_language,
            kind="action",
        )
        advice = [_normalize_advice_item(str(item), response_language) for item in (parsed.get("advice") or []) if str(item).strip()]
        advice = [item for item in advice if item]

    if _looks_like_wrong_language(summary, response_language) or _is_fragment(summary):
        parsed["summary"] = _fallback_summary(
            response_language=response_language,
            strengths=llm_strengths or strengths,
            improvement_points=llm_improvement_points or improvement_points,
        )
    if _looks_like_wrong_language(parsed.get("summary", ""), response_language) or _is_fragment(str(parsed.get("summary", ""))):
        parsed["summary"] = _build_contextual_summary(
            response_language=response_language,
            competencies=competencies,
            cv_profile=cv_profile if isinstance(cv_profile, dict) else {},
        )
    parsed["strengths"] = llm_strengths[:3]
    parsed["improvement_points"] = llm_improvement_points[:3] or improvement_points[:3]
    parsed["dimension_signals"] = llm_dimension_signals
    parsed["dimension_actions"] = llm_dimension_actions
    parsed["recommendations"] = []
    if not advice or any(_looks_like_wrong_language(item, response_language) for item in advice):
        parsed["advice"] = _fallback_advice(response_language)
    else:
        parsed["advice"] = advice[:3]

    return parsed
