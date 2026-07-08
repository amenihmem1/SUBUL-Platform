from __future__ import annotations

import re
import unicodedata
from typing import Any, Callable

from interview_ai.payloads import normalize_skills
from interview_ai.prompts import build_chat_messages, build_cv_summary


RequestJsonFn = Callable[..., dict[str, Any]]
NormalizeScoresFn = Callable[[Any], dict[str, int]]

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


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("'", " ")
    return " ".join(normalized.lower().split()).strip()


def _is_trivial_launch_message(text: str) -> bool:
    return _normalize_text(text) in TRIVIAL_LAUNCH_MESSAGES


def _has_meaningful_scores(scores: dict[str, int]) -> bool:
    return any(int(scores.get(key, 0)) > 0 for key in ("communication", "teamwork", "problem_solving", "motivation"))


def _empty_turn_scoring_payload() -> dict[str, Any]:
    score_partial = {
        "communication": 0,
        "teamwork": 0,
        "problem_solving": 0,
        "motivation": 0,
    }
    return {
        "score_partial": score_partial,
        "skills": normalize_skills({}, score_partial),
    }


def _normalize_turn_scoring_payload(
    parsed: dict[str, Any],
    normalize_scores: NormalizeScoresFn,
) -> dict[str, Any]:
    if isinstance(parsed, dict) and isinstance(parsed.get("score_partial"), dict):
        score_partial = normalize_scores(parsed.get("score_partial"))
        skills = normalize_skills(parsed.get("skills"), score_partial)
        return {
            "score_partial": score_partial,
            "skills": skills,
        }

    score_partial = normalize_scores(parsed if isinstance(parsed, dict) else {})
    return {
        "score_partial": score_partial,
        "skills": normalize_skills({}, score_partial),
    }


def _heuristic_competency_scores(history_text: str) -> dict[str, int]:
    normalized = _normalize_text(history_text)
    searchable = f" {normalized} "
    word_count = len(re.findall(r"\b[\w'-]+\b", normalized, flags=re.UNICODE))

    communication = 1 if word_count >= 40 else 0
    teamwork = 1 if word_count >= 30 else 0
    problem_solving = 1 if word_count >= 30 else 0
    motivation = 1 if word_count >= 20 else 0

    if any(marker in searchable for marker in (" communication ", " communi", " discussion ", " reunion ", " argument ", " clarifier ", " exprimer ", " echange ")):
        communication = max(communication, 3)
    elif word_count >= 90:
        communication = max(communication, 2)

    if any(marker in searchable for marker in (" equipe ", " ensemble ", " colleg", " collabor", " membre ", " nous avons ", " tout le monde ")):
        teamwork = max(teamwork, 3)
    if " compromis " in searchable or " align" in searchable:
        teamwork = max(teamwork, 4)

    if any(marker in searchable for marker in (" probleme ", " defi ", " difficulte ", " solution ", " compromis ", " priorit", " blocage ", " resoudre ")):
        problem_solving = max(problem_solving, 3)
    if " architecture " in searchable or " conception " in searchable:
        problem_solving = max(problem_solving, 4)

    if any(marker in searchable for marker in (" motive", " attire", " apprendre ", " evol", " progress", " impact ", " utile ", " stage ", " entreprise ", " poste ")):
        motivation = max(motivation, 3)
    if any(marker in searchable for marker in (" tres motive", " passion ", " enthousias")):
        motivation = max(motivation, 4)

    return {
        "communication": min(4, communication),
        "teamwork": min(4, teamwork),
        "problem_solving": min(4, problem_solving),
        "motivation": min(4, motivation),
    }


def _calibrate_low_scores_with_heuristics(
    scores: dict[str, int],
    heuristic_scores: dict[str, int],
) -> dict[str, int]:
    calibrated = dict(scores)
    for key, heuristic_value in heuristic_scores.items():
        current_value = max(0, min(5, int(calibrated.get(key, 0) or 0)))
        heuristic_value = max(0, min(4, int(heuristic_value or 0)))
        if heuristic_value <= 0:
            calibrated[key] = current_value
        elif current_value <= 0:
            calibrated[key] = heuristic_value
        elif current_value <= 2 and heuristic_value >= 3:
            calibrated[key] = heuristic_value
        else:
            calibrated[key] = current_value
    return calibrated


def score_interview_turn(
    *,
    request_json: RequestJsonFn,
    normalize_scores: NormalizeScoresFn,
    cv_profile: dict[str, Any],
    recent_turns: list[dict[str, Any]],
    question: str,
    answer: str,
    question_phase: str,
    response_language: str = "fr",
) -> dict[str, Any]:
    cleaned_answer = str(answer or "").strip()
    if not cleaned_answer or _is_trivial_launch_message(cleaned_answer):
        return _empty_turn_scoring_payload()

    question = str(question or "").strip()
    phase = str(question_phase or "").strip().upper() or "INTRO"
    cv_summary = build_cv_summary(cv_profile) if isinstance(cv_profile, dict) else "Profil CV non disponible."

    history_lines: list[str] = []
    for turn in recent_turns[-3:]:
        if not isinstance(turn, dict):
            continue
        previous_question = str(turn.get("say", "")).strip()[:140]
        previous_answer = str(turn.get("candidate_text", "")).strip()[:220]
        if previous_question or previous_answer:
            history_lines.append(f"Q: {previous_question}\nR: {previous_answer}")
    history_text = "\n\n".join(history_lines) if history_lines else "Aucun historique exploitable."
    turn_text = f"Q: {question[:180] or 'Aucune question precedente'}\nR: {cleaned_answer[:420]}"
    heuristic_scores = _heuristic_competency_scores(cleaned_answer)

    if response_language == "en":
        system = (
            "You are a dedicated HR scoring tool. "
            "Score only the candidate answer to the last interviewer question. "
            "Reply ONLY with valid JSON."
        )
        user = (
            "Evaluate this single interview answer from 0 to 5 on: communication, teamwork, problem_solving, motivation.\n"
            "First check whether the answer directly addresses the interviewer question.\n"
            "Use 2 for a relevant but brief answer, 3 for a clear relevant answer, 4 for a concrete structured answer, and 5 only for exceptional repeated evidence.\n"
            "Use 0 for a competency that is not observable in this answer; 0 means not observed, not a penalty.\n"
            "If the answer is off-topic, generic, or only repeats HR keywords, cap every score at 1 unless it contains concrete relevant evidence.\n"
            "Do not award points only because words like team, communication, motivation, or problem appear.\n"
            "Use 0 only when there is truly no usable evidence.\n"
            "Keep evidence very short.\n"
            "Return ONLY this JSON:\n"
            '{"score_partial":{"communication":0,"teamwork":0,"problem_solving":0,"motivation":0},'
            '"skills":{"communication":{"level":0,"evidence":""},"teamwork":{"level":0,"evidence":""},'
            '"problem_solving":{"level":0,"evidence":""},"motivation":{"level":0,"evidence":""}}}\n\n'
            f"Question phase:\n{phase}\n\n"
            f"CV summary:\n{cv_summary}\n\n"
            f"Recent context:\n{history_text}\n\n"
            f"Answer to score:\n{turn_text}"
        )
    else:
        system = (
            "Tu es un outil de scoring RH dedie. "
            "Tu notes uniquement la reponse du candidat a la derniere question posee. "
            "Reponds UNIQUEMENT avec un JSON valide."
        )
        user = (
            "Evalue cette seule reponse de 0 a 5 sur : communication, teamwork, problem_solving, motivation.\n"
            "Verifie d'abord si la reponse repond directement a la question posee.\n"
            "Utilise 2 pour une reponse pertinente mais breve, 3 pour une reponse claire et pertinente, 4 pour une reponse concrete et structuree, et 5 seulement pour des indices exceptionnels et repetes.\n"
            "Utilise 0 pour une competence non observable dans cette reponse ; 0 signifie non observe, pas une penalite.\n"
            "Si la reponse est hors sujet, generique, ou repete seulement des mots-cles RH, limite tous les scores a 1 sauf preuve concrete et pertinente.\n"
            "N'attribue pas de points uniquement parce que des mots comme equipe, communication, motivation ou probleme apparaissent.\n"
            "Utilise 0 uniquement s'il n'existe vraiment aucun indice exploitable.\n"
            "Garde une evidence tres courte pour chaque competence.\n"
            "Retourne UNIQUEMENT ce JSON :\n"
            '{"score_partial":{"communication":0,"teamwork":0,"problem_solving":0,"motivation":0},'
            '"skills":{"communication":{"level":0,"evidence":""},"teamwork":{"level":0,"evidence":""},'
            '"problem_solving":{"level":0,"evidence":""},"motivation":{"level":0,"evidence":""}}}\n\n'
            f"Phase de la question :\n{phase}\n\n"
            f"Resume CV :\n{cv_summary}\n\n"
            f"Contexte recent :\n{history_text}\n\n"
            f"Reponse a noter :\n{turn_text}"
        )

    parsed = request_json(
        messages=build_chat_messages(
            system_content=system,
            user_content=user,
        ),
        max_tokens=260,
        temperature=0.1,
        log_mode="score_turn_prompt_json",
        phase=phase,
    )
    normalized = _normalize_turn_scoring_payload(parsed, normalize_scores)
    normalized["score_partial"] = _calibrate_low_scores_with_heuristics(normalized["score_partial"], heuristic_scores)
    normalized["skills"] = normalize_skills(normalized.get("skills"), normalized["score_partial"])
    if _has_meaningful_scores(normalized["score_partial"]):
        return normalized

    retry = request_json(
        messages=build_chat_messages(
            system_content=system,
            user_content=(
                f"{user}\n\n"
                "La reponse precedente etait trop conservative. "
                "Reevalue cette reponse tour par tour et attribue un score non nul des qu'il existe "
                "un indice clair de communication, collaboration, resolution de probleme ou motivation."
            ),
        ),
        max_tokens=300,
        temperature=0.05,
        log_mode="score_turn_prompt_json_retry",
        phase=phase,
    )
    normalized_retry = _normalize_turn_scoring_payload(retry, normalize_scores)
    normalized_retry["score_partial"] = _calibrate_low_scores_with_heuristics(normalized_retry["score_partial"], heuristic_scores)
    normalized_retry["skills"] = normalize_skills(normalized_retry.get("skills"), normalized_retry["score_partial"])
    if _has_meaningful_scores(normalized_retry["score_partial"]):
        return normalized_retry

    return {
        "score_partial": heuristic_scores,
        "skills": normalize_skills({}, heuristic_scores),
    }


def infer_competencies_from_interview(
    *,
    request_json: RequestJsonFn,
    normalize_scores: NormalizeScoresFn,
    cv_profile: dict[str, Any],
    turns: list[dict[str, Any]],
    response_language: str = "fr",
) -> dict[str, int]:
    history_lines: list[str] = []
    answer_lines: list[str] = []
    for turn in turns[-6:]:
        if not isinstance(turn, dict):
            continue
        question = str(turn.get("say", "")).strip()[:160]
        answer = str(turn.get("candidate_text", "")).strip()[:320]
        if _is_trivial_launch_message(answer):
            continue
        if answer:
            answer_lines.append(answer)
        if question or answer:
            history_lines.append(f"Q: {question}\nR: {answer}")

    history_text = "\n\n".join(history_lines) if history_lines else "Aucun historique exploitable."
    answer_text = "\n\n".join(answer_lines) if answer_lines else ""
    cv_summary = build_cv_summary(cv_profile) if isinstance(cv_profile, dict) else "Profil CV non disponible."

    if response_language == "en":
        system = (
            "You are a senior HR recruiter. "
            "Assess the candidate only from the interview excerpts and CV summary. "
            "Reply ONLY with a valid JSON object."
        )
        user = (
            "Evaluate these competencies from 0 to 5: communication, teamwork, problem_solving, motivation.\n"
            "Prioritize whether each answer addresses its question; generic or off-topic answers must not receive high scores just because they contain competency keywords.\n"
            "Use 2 for relevant but brief evidence, 3 for clear relevant evidence, 4 for concrete structured evidence, and 5 only for exceptional repeated evidence.\n"
            "Use 0 for a competency that is not observable; 0 means not observed, not a penalty.\n"
            "Use 0 only when there is truly no usable evidence.\n"
            "Return ONLY this JSON shape:\n"
            '{"communication":0,"teamwork":0,"problem_solving":0,"motivation":0}\n\n'
            f"CV summary:\n{cv_summary}\n\n"
            f"Interview excerpts:\n{history_text}"
        )
    else:
        system = (
            "Tu es un recruteur RH senior. "
            "Evalue le candidat uniquement a partir des extraits d'entretien et du resume CV. "
            "Reponds UNIQUEMENT avec un objet JSON valide."
        )
        user = (
            "Evalue ces competences de 0 a 5 : communication, teamwork, problem_solving, motivation.\n"
            "Priorise la pertinence de chaque reponse par rapport a sa question ; une reponse generique ou hors sujet ne doit pas recevoir un score eleve seulement parce qu'elle contient des mots-cles de competence.\n"
            "Utilise 2 pour des indices pertinents mais brefs, 3 pour des indices clairs et pertinents, 4 pour des indices concrets et structures, et 5 seulement pour des indices exceptionnels et repetes.\n"
            "Utilise 0 pour une competence non observable ; 0 signifie non observe, pas une penalite.\n"
            "Utilise 0 uniquement s'il n'existe vraiment aucun indice exploitable.\n"
            "Le score 5 doit rester rare et justifie par des indices clairs, coherents et repetes.\n"
            "N'attribue pas 5 a toutes les competences par defaut.\n"
            "Retourne UNIQUEMENT ce JSON :\n"
            '{"communication":0,"teamwork":0,"problem_solving":0,"motivation":0}\n\n'
            f"Resume CV:\n{cv_summary}\n\n"
            f"Extraits d'entretien:\n{history_text}"
        )

    parsed = request_json(
        messages=build_chat_messages(
            system_content=system,
            user_content=user,
        ),
        max_tokens=180,
        temperature=0.1,
        log_mode="infer_scores_prompt_json",
        phase="FINAL",
    )
    heuristic_scores = _heuristic_competency_scores(answer_text)

    def _fill_missing_with_heuristics(scores: dict[str, int]) -> dict[str, int]:
        return _calibrate_low_scores_with_heuristics(scores, heuristic_scores)

    normalized = _fill_missing_with_heuristics(normalize_scores(parsed))
    if _has_meaningful_scores(normalized):
        return normalized

    retry = request_json(
        messages=build_chat_messages(
            system_content=system,
            user_content=(
                f"{user}\n\n"
                "La reponse precedente a retourne des scores tous a 0. "
                "Recommence avec une reevaluation plus genereuse des qu'il existe un exemple concret, "
                "une motivation exprimee, une communication d'equipe ou une resolution de probleme."
            ),
        ),
        max_tokens=220,
        temperature=0.05,
        log_mode="infer_scores_prompt_json_retry",
        phase="FINAL",
    )
    normalized_retry = _fill_missing_with_heuristics(normalize_scores(retry))
    if _has_meaningful_scores(normalized_retry):
        return normalized_retry

    return heuristic_scores
