"""
roadmap_agent.py — Agent Roadmap Personnalisé (3 phases)

Architecture :
  Phase 1 — ASSESSMENT conversationnel : LLM pose des questions adaptatives
             pour détecter le profil de l'utilisateur (Cloud / Cyber / IA)
  Phase 2 — TEST DE NIVEAU : LLM génère des questions techniques adaptées
             au profil détecté, évalue les réponses et détermine le niveau
  Phase 3 — ROADMAP : LLM + RAG génère un roadmap de certifications
             personnalisé basé sur le profil et le niveau

Différence vs la version statique (NestJS) :
  - Questions dynamiques et adaptatives (pas de banque fixe)
  - Profil détecté par le LLM (pas de pondération hard-codée)
  - Roadmap généré par le LLM depuis les cours indexés dans Azure Search
"""

import os
import sys
import json
import asyncio
import httpx
import time
from functools import lru_cache
from dotenv import load_dotenv
from openai import AsyncAzureOpenAI
from azure.core.credentials import AzureKeyCredential

from memory_management import MemoryManager, CosmosDBAdapter
from search_index_manager import SearchIndexManager

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(os.path.dirname(_BASE_DIR))

load_dotenv(os.path.join(_BASE_DIR, ".env"))
load_dotenv(os.path.join(_BASE_DIR, ".env.txt"))

# ══════════════════════════════════════════════════════════════════════════════
# CACHE FOR OPTIMIZATION
# ══════════════════════════════════════════════════════════════════════════════

class OptimizedSearchManager:
    def __init__(self, search_manager):
        self._search = search_manager
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
    
    async def search_cached(self, query: str, top_k: int = 10):
        cache_key = f"{query}_{top_k}"
        now = time.time()
        
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if now - timestamp < self._cache_ttl:
                print(f"   🚀 CACHE HIT pour: {cache_key}")
                return cached_data
        
        print(f"   🔍 CACHE MISS, recherche: {query}")
        result = await self._search.search_structured(query, top_k)
        self._cache[cache_key] = (result, now)
        return result

# ══════════════════════════════════════════════════════════════════════════════
# FALLBACK ROADMAP TEMPLATES
# ══════════════════════════════════════════════════════════════════════════════

ROADMAP_TEMPLATES = {
    "cloud_debutant": {
        "roadmap_title": "Cloud Foundation Path",
        "roadmap_summary": "Parcours complet pour maîtriser les fondamentaux du Cloud Computing avec Azure et AWS.",
        "total_estimated_weeks": 16,
        "total_certifications": 3,
        "user_level": "Débutant",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "Fondamentaux Cloud",
                "phase_description": "Maîtrisez les concepts de base du cloud computing",
                "duration_weeks": 8,
                "level_tier": "Fondamental",
                "certifications": [
                    {
                        "ordre": 1,
                        "nom": "Azure Fundamentals",
                        "code": "AZ-900",
                        "provider": "Microsoft",
                        "niveau_certif": "Fondamental",
                        "duree_preparation_semaines": 4,
                        "heures_etude": 20,
                        "prerequis": [],
                        "pourquoi_cette_certif": "Certification de base essentielle pour comprendre Azure",
                        "competences_acquises": ["Concepts Cloud", "Services Azure", "Tarification", "Sécurité de base"],
                        "statut": "current",
                        "xp_reward": 100
                    },
                    {
                        "ordre": 2,
                        "nom": "AWS Cloud Practitioner",
                        "code": "CLF-C02",
                        "provider": "AWS",
                        "niveau_certif": "Fondamental",
                        "duree_preparation_semaines": 4,
                        "heures_etude": 20,
                        "prerequis": [],
                        "pourquoi_cette_certif": "Certification fondamentale pour maîtriser AWS",
                        "competences_acquises": ["Concepts AWS", "Services Core", "Régions", "IAM"],
                        "statut": "upcoming",
                        "xp_reward": 100
                    }
                ]
            },
            {
                "phase_number": 2,
                "phase_name": "Pratique Avancée",
                "phase_description": "Approfondissez vos compétences avec des services avancés",
                "duration_weeks": 8,
                "level_tier": "Associé",
                "certifications": [
                    {
                        "ordre": 3,
                        "nom": "Azure Administrator Associate",
                        "code": "AZ-104",
                        "provider": "Microsoft",
                        "niveau_certif": "Associé",
                        "duree_preparation_semaines": 8,
                        "heures_etude": 40,
                        "prerequis": ["AZ-900"],
                        "pourquoi_cette_certif": "Gérez et administrez des environnements Azure",
                        "competences_acquises": ["Administration", "Stockage", "Réseaux", "Sécurité"],
                        "statut": "locked",
                        "xp_reward": 200
                    }
                ]
            }
        ],
        "conseil_final": "Commencez par AZ-900 pour construire des bases solides, puis passez à CLF-C02 pour comparer les approches."
    },
    "cyber_debutant": {
        "roadmap_title": "Cybersecurity Foundation Path",
        "roadmap_summary": "Parcours complet pour devenir expert en cybersécurité avec Microsoft et AWS.",
        "total_estimated_weeks": 20,
        "total_certifications": 3,
        "user_level": "Débutant",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "Fondamentaux Sécurité",
                "phase_description": "Maîtrisez les concepts essentiels de la cybersécurité",
                "duration_weeks": 10,
                "level_tier": "Fondamental",
                "certifications": [
                    {
                        "ordre": 1,
                        "nom": "Security, Compliance, and Identity Fundamentals",
                        "code": "SC-900",
                        "provider": "Microsoft",
                        "niveau_certif": "Fondamental",
                        "duree_preparation_semaines": 5,
                        "heures_etude": 25,
                        "prerequis": [],
                        "pourquoi_cette_certif": "Comprendre les principes fondamentaux de la sécurité",
                        "competences_acquises": ["Concepts Sécurité", "Conformité", "Identité", "Gouvernance"],
                        "statut": "current",
                        "xp_reward": 100
                    },
                    {
                        "ordre": 2,
                        "nom": "AWS Security Specialty",
                        "code": "SCS-C02",
                        "provider": "AWS",
                        "niveau_certif": "Spécialité",
                        "duree_preparation_semaines": 5,
                        "heures_etude": 25,
                        "prerequis": ["CLF-C02"],
                        "pourquoi_cette_certif": "Spécialisation en sécurité AWS avancée",
                        "competences_acquises": ["Sécurité AWS", "Monitoring", "Incident Response"],
                        "statut": "locked",
                        "xp_reward": 150
                    }
                ]
            }
        ],
        "conseil_final": "La sécurité commence par les fondamentaux. SC-900 est votre point d'entrée idéal."
    },
    "ai_debutant": {
        "roadmap_title": "AI & Machine Learning Path",
        "roadmap_summary": "Parcours complet pour maîtriser l'intelligence artificielle et le machine learning.",
        "total_estimated_weeks": 24,
        "total_certifications": 4,
        "user_level": "Débutant",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "Fondamentaux IA",
                "phase_description": "Découvrez les bases de l'intelligence artificielle et du machine learning",
                "duration_weeks": 12,
                "level_tier": "Fondamental",
                "certifications": [
                    {
                        "ordre": 1,
                        "nom": "Azure AI Fundamentals",
                        "code": "AI-900",
                        "provider": "Microsoft",
                        "niveau_certif": "Fondamental",
                        "duree_preparation_semaines": 4,
                        "heures_etude": 20,
                        "prerequis": [],
                        "pourquoi_cette_certif": "Introduction parfaite aux concepts d'IA",
                        "competences_acquises": ["Concepts IA", "Machine Learning", "Azure AI Services"],
                        "statut": "current",
                        "xp_reward": 100
                    },
                    {
                        "ordre": 2,
                        "nom": "Data Fundamentals",
                        "code": "DP-900",
                        "provider": "Microsoft",
                        "niveau_certif": "Fondamental",
                        "duree_preparation_semaines": 4,
                        "heures_etude": 20,
                        "prerequis": [],
                        "pourquoi_cette_certif": "Bases essentielles en gestion de données",
                        "competences_acquises": ["Concepts Data", "Bases de données", "Analyse"],
                        "statut": "upcoming",
                        "xp_reward": 100
                    }
                ]
            }
        ],
        "conseil_final": "L'IA commence par les données. Maîtrisez DP-900 avant d'aller plus loin avec AI-900."
    }
}


# ══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

PROMPT_ASSESSEUR = """Tu es Subul, un conseiller d'orientation expert et empathique, spécialisé dans les technologies Cloud, Cybersécurité et Intelligence Artificielle.

🎯 TON OBJECTIF : Découvrir le profil idéal de l'apprenant en menant une conversation naturelle et adaptative.

🌍 RÈGLE DE LANGUE : Réponds TOUJOURS dans la même langue que l'utilisateur (Français ou Anglais).

📌 TROIS PROFILS POSSIBLES :
- **Cloud & DevOps** : Azure, AWS, GCP, infrastructure, Kubernetes, CI/CD, Terraform, microservices
- **Cybersécurité** : Pentest, SOC, réseaux, cryptographie, défense, conformité, SIEM, forensics
- **Intelligence Artificielle** : Machine Learning, LLMs, Data Science, MLOps, NLP, Computer Vision

🗣️ RÈGLES DE CONDUITE :
1. Pose UNE SEULE question à la fois — courte, claire, engageante.
2. Commence par une question ouverte sur les aspirations/motivations profondes.
3. Adapte chaque nouvelle question aux réponses précédentes de l'apprenant.
4. Explore des angles variés : ce qui motive, ce qui fascine, les expériences passées, les ambitions.
5. Tu peux poser entre 4 et 7 questions. Arrête-toi quand tu as suffisamment d'informations.
6. Quand tu as assez d'informations, **termine** ta question par la balise exacte : [ASSESSMENT_READY]

⚠️ NE RETOURNE JAMAIS le JSON de résultat toi-même — c'est un autre système qui l'analyse.
⚠️ Ne mentionne JAMAIS les trois profils dans tes questions — cela biaiserait les réponses.
"""

PROMPT_ANALYSEUR = """Tu es un expert en orientation technologique. Analyse la conversation d'assessment suivante et détermine le profil technologique optimal de l'apprenant.

🎯 FORMAT DE SORTIE (JSON STRICT, rien d'autre) :
{
  "profile": "cloud" | "cyber" | "ai",
  "confidence": 0.0-1.0,
  "scores": {
    "cloud": 0-100,
    "cyber": 0-100,
    "ai": 0-100
  },
  "hybrid": null | "cloud+cyber" | "cloud+ai" | "cyber+ai",
  "summary_fr": "Résumé du profil en 2-3 phrases pour l'apprenant (en français).",
  "summary_en": "Profile summary in 2-3 sentences for the learner (in English).",
  "strengths": ["force 1", "force 2", "force 3"],
  "recommended_first_certification": "Nom de la première certification recommandée (Azure ou AWS uniquement)"
}

📏 RÈGLES :
- "hybrid" est non-null si les deux meilleurs scores diffèrent de moins de 15 points.
- "confidence" reflète la clarté du profil (1.0 = très clair, 0.5 = ambigu).
- "recommended_first_certification" doit être une certification Microsoft Azure ou Amazon AWS (ex: "AZ-900", "AWS Cloud Practitioner", "AI-900", "SC-900").
- NE retourne QUE le JSON, sans texte avant ou après.
"""

PROMPT_GENERATEUR_ASSESSMENT = """Tu es un expert en orientation technologique. Génère exactement 7 questions à choix multiples (A, B, C) pour détecter le profil d'un apprenant parmi : Cloud & DevOps, Cybersécurité, Intelligence Artificielle.

🌍 RÈGLE DE LANGUE : Génère les questions dans la langue spécifiée (fr ou en).

🎯 FORMAT DE SORTIE (JSON STRICT, rien d'autre) :
{
  "questions": [
    {
      "id": 1,
      "question": "Question engageante sur les aspirations/intérêts de l'apprenant ?",
      "options": {
        "A": "Réponse orientée vers l'un des trois domaines",
        "B": "Réponse orientée vers un autre domaine",
        "C": "Réponse orientée vers le troisième domaine"
      },
      "domain_mapping": {
        "A": "cloud",
        "B": "cyber",
        "C": "ai"
      }
    }
  ]
}

📏 RÈGLES :
- Génère exactement 7 questions.
- Chaque question explore un angle DIFFÉRENT : aspirations métier, intérêts techniques, outils préférés, problèmes à résoudre, actualités tech, type de challenge, projets rêvés.
- L'ordre des domaines dans les options (A/B/C = Cloud/Cyber/IA) doit VARIER entre les questions pour éviter le biais de position.
- Questions engageantes, concrètes, centrées sur l'apprenant (pas sur des définitions académiques).
- Ne mentionne JAMAIS explicitement "Cloud", "Cybersécurité" ou "IA" dans les options — décris les activités concrètes.
- NE retourne QUE le JSON, sans texte avant ou après.
"""

# Used when Azure OpenAI is unavailable, misconfigured, or returns invalid JSON (dev / outage).
_FALLBACK_ASSESS_QUESTIONS_FR: dict = {
    "questions": [
        {
            "id": 1,
            "question": "Quel type de projet vous attire le plus ?",
            "options": {
                "A": "Déployer des applications fiables et scalables sur des plateformes distantes",
                "B": "Renforcer la résilience des systèmes face aux accès non autorisés",
                "C": "Expérimenter avec des modèles qui apprennent à partir de données",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 2,
            "question": "Quelle actualité tech vous intéresse davantage ?",
            "options": {
                "A": "Nouveautés sur les services managés et l’infra à la demande",
                "B": "Incidents, fuites de données et bonnes pratiques de défense",
                "C": "Progrès des assistants et de l’automatisation intelligente",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 3,
            "question": "Dans une équipe, où vous sentez-vous le plus utile ?",
            "options": {
                "A": "Automatiser pipelines et environnements reproductibles",
                "B": "Auditer, durcir et surveiller les accès",
                "C": "Prototyper des fonctionnalités basées sur la donnée",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 4,
            "question": "Quel défi vous motive ?",
            "options": {
                "A": "Réduire les coûts et le temps de mise en production",
                "B": "Réduire la surface d’attaque et détecter les menaces",
                "C": "Améliorer la pertinence des recommandations ou prédictions",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 5,
            "question": "Quel outil ou pratique vous parle le plus ?",
            "options": {
                "A": "Conteneurs, CI/CD, observabilité",
                "B": "SIEM, durcissement, analyse de logs",
                "C": "Notebooks, features, évaluation de modèles",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 6,
            "question": "Pour votre prochaine formation, vous choisiriez plutôt :",
            "options": {
                "A": "Architecture et exploitation de plateformes",
                "B": "Réponse à incident et gouvernance de la sécurité",
                "C": "Fondamentaux du machine learning appliqué",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 7,
            "question": "Dans 2 ans, vous aimeriez plutôt :",
            "options": {
                "A": "Concevoir des environnements cloud résilients",
                "B": "Piloter une stratégie défensive pour l’organisation",
                "C": "Livrer des produits avec des composants intelligents intégrés",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
    ]
}

_FALLBACK_ASSESS_QUESTIONS_EN: dict = {
    "questions": [
        {
            "id": 1,
            "question": "Which project style appeals to you most?",
            "options": {
                "A": "Running reliable, scalable apps on remote platforms",
                "B": "Hardening systems against unauthorized access",
                "C": "Experimenting with models that learn from data",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 2,
            "question": "Which tech news grabs you more?",
            "options": {
                "A": "Managed services and on-demand infrastructure",
                "B": "Breaches, incidents, and defensive practices",
                "C": "Assistants and intelligent automation",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 3,
            "question": "On a team, where do you feel most useful?",
            "options": {
                "A": "Automating pipelines and reproducible environments",
                "B": "Auditing, hardening, and monitoring access",
                "C": "Prototyping data-driven features",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 4,
            "question": "Which challenge motivates you?",
            "options": {
                "A": "Cutting cost and time to ship",
                "B": "Shrinking attack surface and detecting threats",
                "C": "Improving relevance of recommendations or predictions",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 5,
            "question": "Which practice resonates most?",
            "options": {
                "A": "Containers, CI/CD, observability",
                "B": "SIEM, hardening, log analysis",
                "C": "Notebooks, features, model evaluation",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 6,
            "question": "For your next course, you would pick:",
            "options": {
                "A": "Platform architecture and operations",
                "B": "Incident response and security governance",
                "C": "Applied machine learning fundamentals",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
        {
            "id": 7,
            "question": "In two years you would rather:",
            "options": {
                "A": "Design resilient cloud environments",
                "B": "Lead defensive strategy for the organization",
                "C": "Ship products with embedded intelligent components",
            },
            "domain_mapping": {"A": "cloud", "B": "cyber", "C": "ai"},
        },
    ]
}


def _validate_assess_payload(data: dict) -> bool:
    qs = data.get("questions")
    if not isinstance(qs, list) or len(qs) < 1:
        return False
    for q in qs:
        if not isinstance(q, dict):
            return False
        if "question" not in q or "options" not in q or "domain_mapping" not in q:
            return False
        opts = q.get("options")
        dom = q.get("domain_mapping")
        if not isinstance(opts, dict) or not isinstance(dom, dict):
            return False
        for k in ("A", "B", "C"):
            if k not in opts or k not in dom:
                return False
            if dom[k] not in ("cloud", "cyber", "ai"):
                return False
    return True


PROMPT_GENERATEUR_NIVEAU = """Tu es QuizMaster, expert en évaluation technique dans les domaines Cloud, Cybersécurité et IA.

🌍 RÈGLE DE LANGUE : Génère le test dans la langue spécifiée.

🎯 FORMAT DE SORTIE (JSON STRICT) :
{
  "profile": "cloud" | "cyber" | "ai",
  "niveau_test": "Débutant → Expert",
  "questions": [
    {
      "id": 1,
      "question": "Question technique précise ?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "bonne_reponse": "B",
      "explication": "Pourquoi B est correct (1 phrase).",
      "difficulte": "facile" | "moyen" | "difficile",
      "points": 1 | 2 | 3
    }
  ]
}

📏 RÈGLES :
- Génère exactement 8 questions : 3 faciles (1 pt), 3 moyennes (2 pts), 2 difficiles (3 pts).
- Questions UNIQUEMENT sur le profil spécifié — questions réelles et précises.
- Mélange : concepts fondamentaux, services spécifiques, cas pratiques.
- Les options doivent être plausibles (pas de leurres évidents).
- NE retourne QUE le JSON, sans texte avant ou après.
"""

PROMPT_EVALUATEUR_NIVEAU = """Tu es un évaluateur expert. Analyse les réponses d'un apprenant au test de niveau et détermine son niveau.

🎯 FORMAT DE SORTIE (JSON STRICT) :
{
  "niveau": "Débutant" | "Intermédiaire" | "Expert",
  "score": {
    "obtenu": <points obtenus>,
    "total": <points totaux>,
    "pourcentage": <0-100>
  },
  "analyse": "Analyse bienveillante du niveau en 2 phrases (dans la langue de l'apprenant).",
  "points_forts": ["compétence 1", "compétence 2"],
  "points_a_renforcer": ["lacune 1", "lacune 2"],
  "questions_detail": [
    {
      "id": <question_id>,
      "correct": true | false,
      "reponse_apprenant": "<lettre>",
      "bonne_reponse": "<lettre>",
      "explication": "<explication de la bonne réponse>"
    }
  ]
}

📏 RÈGLES :
- Débutant : < 45% | Intermédiaire : 45-74% | Expert : ≥ 75%
- NE retourne QUE le JSON, sans texte avant ou après.
"""

PROMPT_ROADMAP = """Tu es Subul, un architecte pédagogique expert en certifications Microsoft Azure et Amazon AWS.

🌍 RÈGLE DE LANGUE : Réponds TOUJOURS dans la même langue que l'utilisateur.

⚠️ CONTRAINTE ABSOLUE : Utilise UNIQUEMENT des certifications Microsoft Azure et Amazon AWS.
   Aucune autre certification n'est autorisée (pas de Google, pas de CompTIA, pas de Cisco, etc.).

📚 CATALOGUE DE CERTIFICATIONS AUTORISÉES :

🔷 Microsoft Azure :
  Fondamental : AZ-900 (Azure Fundamentals), DP-900 (Data Fundamentals), AI-900 (AI Fundamentals), SC-900 (Security Fundamentals)
  Associé     : AZ-104 (Administrator Associate), AZ-204 (Developer Associate), AZ-500 (Security Engineer),
                AZ-700 (Network Engineer Associate), DP-203 (Data Engineer Associate), AI-102 (AI Engineer Associate),
                DP-100 (Data Scientist Associate)
  Expert      : AZ-305 (Solutions Architect Expert), AZ-400 (DevOps Engineer Expert)

🟠 Amazon AWS :
  Fondamental  : CLF-C02 (AWS Cloud Practitioner)
  Associé      : SAA-C03 (Solutions Architect Associate), DVA-C02 (Developer Associate),
                 SOA-C02 (SysOps Administrator Associate), DEA-C01 (Data Engineer Associate)
  Professionnel: SAP-C02 (Solutions Architect Professional), DOP-C02 (DevOps Engineer Professional)
  Spécialité   : MLS-C01 (Machine Learning Specialty), SCS-C02 (Security Specialty), DAS-C01 (Data Analytics Specialty)

🎯 DONNÉES DE L'APPRENANT :
- Profil détecté : {profile}
- Niveau actuel : {niveau}
- Forces : {forces}
- Points à renforcer : {points_a_renforcer}
- Première certification recommandée : {premiere_certif}
- Score au test de niveau : {score_pct}%

📋 RÈGLES DE NIVEAU POUR L'ORDONNANCEMENT :
- Débutant      → Phase 1: Fondamental → Phase 2: Associé → Phase 3: Expert/Professionnel
- Intermédiaire → Phase 1: Associé (+ 1 Fondamental optionnel) → Phase 2: Expert/Professionnel → Phase 3: Spécialité
- Expert        → Phase 1: Expert/Professionnel → Phase 2: Spécialité avancée

📋 FORMAT DE SORTIE (JSON STRICT) :
{{
  "roadmap_title": "Titre personnalisé du roadmap",
  "roadmap_summary": "Introduction motivante en 2-3 phrases pour l'apprenant.",
  "total_estimated_weeks": <nombre>,
  "total_certifications": <nombre>,
  "user_level": "{niveau}",
  "phases": [
    {{
      "phase_number": 1,
      "phase_name": "Nom de la phase",
      "phase_description": "Description courte (1 phrase).",
      "duration_weeks": <nombre>,
      "level_tier": "Fondamental" | "Associé" | "Expert" | "Professionnel" | "Spécialité",
      "certifications": [
        {{
          "ordre": 1,
          "nom": "Nom exact de la certification",
          "code": "AZ-900" | "CLF-C02" | "SAA-C03" | etc.,
          "provider": "Microsoft" | "AWS",
          "niveau_certif": "Fondamental" | "Associé" | "Expert" | "Professionnel" | "Spécialité",
          "duree_preparation_semaines": <nombre>,
          "heures_etude": <nombre>,
          "prerequis": ["prérequis 1"] | [],
          "pourquoi_cette_certif": "Explication personnalisée en 1-2 phrases.",
          "competences_acquises": ["compétence 1", "compétence 2", "compétence 3"],
          "statut": "current" | "upcoming" | "locked",
          "xp_reward": <nombre>
        }}
      ]
    }}
  ],
  "conseil_final": "Conseil personnalisé et motivant en 2-3 phrases pour l'apprenant."
}}

📏 RÈGLES :
- Génère 2 à 4 phases selon le niveau (Débutant → 3 phases; Expert → 2 phases).
- Les certifications DOIVENT être ordonnées du niveau le plus bas au plus élevé selon le niveau de l'apprenant.
- La première certification dans la phase 1 doit être accessible depuis le niveau actuel.
- Provider = "Microsoft" ou "AWS" UNIQUEMENT.
- Choisis les certifications en fonction du profil : cloud→AZ/SAA, ai→AI-102/MLS, cyber→AZ-500/SCS.
- NE retourne QUE le JSON, sans texte avant ou après.
"""


# ══════════════════════════════════════════════════════════════════════════════
# BRAIN AGENT (miroir de BrainAgent / QuizBrainAgent)
# ══════════════════════════════════════════════════════════════════════════════

class RoadmapBrainAgent:
    """
    Classe principale du Roadmap Agent.
    Initialise les services Azure (OpenAI, Search, CosmosDB) — miroir de BrainAgent.
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
        self.COSMOS_CONTAINER_NAME = os.getenv("AZURE_COSMOS_ROADMAP_CONTAINER_NAME", "AgentRoadmap")

        print(" Connexion réseau optimisée (IPv4 Force)...")

        custom_http_client = httpx.AsyncClient(
            transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0")
        )

        self.async_client = AsyncAzureOpenAI(
            azure_endpoint=self.AZURE_OPENAI_ENDPOINT,
            api_key=self.AZURE_OPENAI_API_KEY,
            api_version="2024-02-15-preview",
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

        # 🚀 Optimisation : Search manager avec cache
        self.optimized_search = OptimizedSearchManager(self.search_index_manager)

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
        print("⚙️ Configuration Cosmos DB (Roadmap)...")
        await self.memory.db_adapter.setup()

        print("⚙️ Vérification Index Azure Search (Roadmap)...")
        await self.search_index_manager.ensure_index_created(
            vector_index_dimensions=self.embed_dimensions
        )

    def get_roadmap_agent(self) -> "RoadmapAgent":
        return RoadmapAgent(
            oai_client=self.async_client,
            chat_model=self.AZURE_OPENAI_DEPLOYMENT,
            search_manager=self.optimized_search,  # 🚀 Utiliser le search optimisé avec cache
            memory=self.memory,
        )


# ══════════════════════════════════════════════════════════════════════════════
# ROADMAP AGENT — 3 PHASES
# ══════════════════════════════════════════════════════════════════════════════

class RoadmapAgent:
    """
    Agent de roadmap personnalisé — 3 phases pilotées par LLM + RAG.

    Phase 1 — ASSESSMENT  : Conversation adaptative pour détecter le profil.
    Phase 2 — NIVEAU      : Test technique généré et évalué par le LLM.
    Phase 3 — ROADMAP     : Génération du roadmap certifications (LLM + RAG).
    """

    ASSESSMENT_READY_SIGNAL = "[ASSESSMENT_READY]"

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

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1A — Assessment : message conversationnel (streaming)
    # ─────────────────────────────────────────────────────────────────────────

    async def assess_message(
        self,
        message: str,
        history: list[dict],
        user_id: str,
        session_id: str,
        lang: str = "fr",
    ):
        """
        Reçoit un message de l'apprenant, retourne la question suivante en streaming.
        Yields des chunks JSON : { "chunk": str, "status": "streaming"|"completed", "ready": bool }
        """
        lang_instruction = (
            "\n\nIMPÉRATIF : Tu t'exprimes UNIQUEMENT en Français."
            if lang == "fr"
            else "\n\nCRITICAL: You MUST respond ONLY in English."
        )

        messages = [
            {"role": "system", "content": PROMPT_ASSESSEUR + lang_instruction},
            *history,
            {"role": "user", "content": message},
        ]

        # Sauvegarde en mémoire (fire-and-forget)
        asyncio.create_task(self._memory.add_user_message(user_id, session_id, message))

        full_response = ""
        stream = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=messages,
            stream=True,
            temperature=0.7,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                full_response += text
                # Masquer la balise signal dans le stream
                visible = text.replace(self.ASSESSMENT_READY_SIGNAL, "")
                if visible:
                    yield json.dumps({
                        "chunk": visible,
                        "status": "streaming",
                        "ready": False,
                    }) + "\n"

        ready = self.ASSESSMENT_READY_SIGNAL in full_response
        # Nettoyer la balise de la réponse sauvegardée
        clean_response = full_response.replace(self.ASSESSMENT_READY_SIGNAL, "").strip()

        asyncio.create_task(
            self._memory.add_agent_message(user_id, session_id, clean_response)
        )

        yield json.dumps({
            "chunk": "",
            "status": "completed",
            "ready": ready,
        }) + "\n"

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1A-BIS — Assessment : génère les questions structurées (quiz style)
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_assess_questions(self, lang: str = "fr") -> dict:
        """
        Génère 7 questions à choix multiples (A/B/C) pour l'assessment de profil.
        Retourne : { questions: [{ id, question, options: {A,B,C}, domain_mapping: {A,B,C} }] }
        """
        lang_instruction = (
            "\n\nGénère les questions en FRANÇAIS."
            if lang == "fr"
            else "\n\nGenerate questions in ENGLISH."
        )

        fallback = _FALLBACK_ASSESS_QUESTIONS_FR if lang == "fr" else _FALLBACK_ASSESS_QUESTIONS_EN

        try:
            response = await self._client.chat.completions.create(
                model=self._chat_model,
                messages=[
                    {"role": "system", "content": PROMPT_GENERATEUR_ASSESSMENT + lang_instruction},
                    {"role": "user", "content": "Génère les 7 questions d'assessment."},
                ],
                temperature=0.8,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content or "{}"
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                import re

                match = re.search(r"\{.*\}", raw, re.DOTALL)
                if not match:
                    raise ValueError(f"JSON invalide depuis le LLM : {raw[:200]}")
                data = json.loads(match.group())

            if _validate_assess_payload(data):
                return data
            print("⚠️ [Roadmap] LLM assess payload invalide, fallback statique.")
            return fallback
        except Exception as e:
            print(f"⚠️ [Roadmap] generate_assess_questions LLM indisponible — fallback : {e}")
            return fallback

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1B — Assessment : analyse et retourne le profil JSON
    # ─────────────────────────────────────────────────────────────────────────

    async def analyze_profile(
        self,
        history: list[dict],
        user_id: str,
        session_id: str,
    ) -> dict:
        """
        Analyse la conversation d'assessment et retourne le profil JSON détecté.
        """
        history_str = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in history
        )

        response = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=[
                {"role": "system", "content": PROMPT_ANALYSEUR},
                {
                    "role": "user",
                    "content": f"Voici la conversation d'assessment :\n\n{history_str}",
                },
            ],
            max_tokens=600,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        profile_data = json.loads(raw)

        # Sauvegarde profil en mémoire longue
        asyncio.create_task(
            self._memory.long.add_summary(
                user_id,
                f"Profil détecté : {profile_data.get('profile')} "
                f"(cloud={profile_data['scores']['cloud']}%, "
                f"cyber={profile_data['scores']['cyber']}%, "
                f"ai={profile_data['scores']['ai']}%). "
                f"{profile_data.get('summary_fr', '')}",
                subject="Résultat Assessment Profil",
            )
        )

        return profile_data

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 2A — Niveau : génération des questions techniques
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_level_questions(
        self,
        profile: str,
        lang: str = "fr",
    ) -> dict:
        """
        Génère 8 questions techniques adaptées au profil détecté.
        Returns JSON avec la liste des questions.
        """
        profile_labels = {
            "cloud": "Cloud & DevOps (Azure, AWS, Kubernetes, Terraform, CI/CD)",
            "cyber": "Cybersécurité (Pentest, SOC, réseaux, cryptographie, SIEM)",
            "ai": "Intelligence Artificielle (Machine Learning, LLMs, Data Science, MLOps)",
        }
        profile_label = profile_labels.get(profile, profile)

        lang_instruction = (
            f"\n\nGénère les questions ENTIÈREMENT en FRANÇAIS. Profil : {profile_label}."
            if lang == "fr"
            else f"\n\nGenerate questions ENTIRELY in ENGLISH. Profile: {profile_label}."
        )

        response = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=[
                {"role": "system", "content": PROMPT_GENERATEUR_NIVEAU},
                {"role": "user", "content": f"Génère le test de niveau pour le profil : {profile_label}.{lang_instruction}"},
            ],
            max_tokens=3000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        return json.loads(raw)

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 2B — Niveau : évaluation des réponses
    # ─────────────────────────────────────────────────────────────────────────

    async def evaluate_level(
        self,
        profile: str,
        questions: list[dict],
        answers: dict[str, str],
        user_id: str,
        session_id: str,
        lang: str = "fr",
    ) -> dict:
        """
        Évalue les réponses au test de niveau et détermine Débutant / Intermédiaire / Expert.
        answers: { "1": "B", "2": "A", ... }
        """
        # Construire le contexte d'évaluation
        eval_lines = []
        for q in questions:
            qid = str(q["id"])
            apprenant = answers.get(qid, "?").upper()
            eval_lines.append(
                f"Q{qid} [{q['difficulte']}, {q['points']} pts] : {q['question']}\n"
                f"  Réponse apprenant : {apprenant} | Bonne réponse : {q['bonne_reponse']}\n"
                f"  Explication : {q['explication']}"
            )

        lang_instruction = (
            "\n\nRéponds ENTIÈREMENT en FRANÇAIS."
            if lang == "fr"
            else "\n\nAnswer ENTIRELY in ENGLISH."
        )

        response = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=[
                {"role": "system", "content": PROMPT_EVALUATEUR_NIVEAU},
                {
                    "role": "user",
                    "content": (
                        f"Profil : {profile}\n\n"
                        + "\n\n".join(eval_lines)
                        + lang_instruction
                    ),
                },
            ],
            max_tokens=1000,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)

        # Sauvegarde niveau en mémoire longue
        asyncio.create_task(
            self._memory.long.add_summary(
                user_id,
                f"Niveau déterminé : {result.get('niveau')} "
                f"({result['score']['pourcentage']:.0f}%). "
                f"Forces : {', '.join(result.get('points_forts', [])[:2])}. "
                f"À renforcer : {', '.join(result.get('points_a_renforcer', [])[:2])}.",
                subject=f"Résultat Test de Niveau — {profile}",
            )
        )

        return result

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 3 — Roadmap : génération personnalisée (streaming + RAG)
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_roadmap(
        self,
        profile: str,
        niveau: str,
        profile_data: dict,
        level_data: dict,
        user_id: str,
        session_id: str,
        lang: str = "fr",
    ):
        """
        Génère le roadmap de certifications personnalisé avec optimisations.
        Utilise le RAG avec cache pour récupérer les certifications disponibles.
        Yields : chunks JSON streaming du roadmap complet.
        """
        try:
            # 🚀 Utiliser le générateur async directement (approche qui fonctionne)
            async for chunk in self._generate_roadmap_inner(
                profile=profile, niveau=niveau, profile_data=profile_data,
                level_data=level_data, user_id=user_id, session_id=session_id, lang=lang,
            ):
                yield chunk
        except Exception as e:
            print(f"   ⚠️ ERREUR GÉNÉRATION - Utilisation du template fallback: {e}")
            # Fallback rapide avec template pré-généré
            fallback_key = f"{profile}_{niveau.lower()}"
            if fallback_key in ROADMAP_TEMPLATES:
                async for chunk in self._stream_fallback_roadmap(ROADMAP_TEMPLATES[fallback_key], lang):
                    yield chunk
            else:
                yield json.dumps({"chunk": "", "status": "error", "error": "Template non trouvé"}) + "\n"

    async def _generate_roadmap_inner(
        self,
        profile: str,
        niveau: str,
        profile_data: dict,
        level_data: dict,
        user_id: str,
        session_id: str,
        lang: str = "fr",
    ):
        """Inner generator — wrapped by generate_roadmap for error handling."""
        # 🚀 Optimisation : Utiliser le search avec cache
        search_query = {
            "cloud": "Azure AZ-900 AZ-104 AZ-305 AZ-400 AWS Cloud Practitioner Solutions Architect Professional DevOps",
            "cyber": "Azure security AZ-500 SC-900 SC-200 AWS Security Specialty SCS-C02 certification",
            "ai": "Azure AI-900 AI-102 DP-900 DP-203 DP-100 AWS Machine Learning Specialty MLS-C01 certification",
        }.get(profile, "Azure AWS certification AZ-900 AWS Cloud Practitioner")

        print(f" [Roadmap RAG] Recherche certifications Azure/AWS pour profil '{profile}'...")
        yield json.dumps({"chunk": "", "status": "searching_certifications"}) + "\n"
        try:
            rag_chunks = await self._search.search_cached(search_query, top_k=10)
        except Exception as rag_err:
            print(f" [Roadmap RAG] Erreur search_structured (fallback statique) : {rag_err}")
            rag_chunks = []

        # Formater les certifications trouvées (Azure et AWS uniquement)
        certif_lines: list[str] = []
        seen_sources = set()
        for chunk in rag_chunks:
            source = chunk.get("source", "")
            # Filtrer : ne garder que Azure (Microsoft) et AWS
            provider_hint = chunk.get("cloud", "") or chunk.get("texte", "")
            is_azure = any(kw in provider_hint.upper() for kw in ["AZURE", "MICROSOFT", "AZ-", "DP-", "AI-", "SC-"])
            is_aws   = any(kw in provider_hint.upper() for kw in ["AWS", "AMAZON", "CLF", "SAA", "DVA", "SAP", "MLS", "SCS", "DAS"])
            if source and source not in seen_sources and (is_azure or is_aws):
                seen_sources.add(source)
                certif_lines.append(
                    f"- [{chunk.get('cloud', 'Cloud')}] {source} : {chunk.get('texte', '')[:200]}"
                )

        # Fallback statique Azure + AWS si RAG ne retourne rien d'utile
        if not certif_lines:
            fallback_by_profile = {
                "cloud": (
                    "Microsoft Azure : AZ-900 (Fondamental), AZ-104 (Associé), AZ-305 (Expert), AZ-400 (Expert)\n"
                    "Amazon AWS     : CLF-C02 (Fondamental), SAA-C03 (Associé), SAP-C02 (Professionnel), DOP-C02 (Professionnel)"
                ),
                "cyber": (
                    "Microsoft Azure : SC-900 (Fondamental), AZ-500 (Associé), SC-200 (Associé)\n"
                    "Amazon AWS     : CLF-C02 (Fondamental), SCS-C02 (Spécialité Sécurité)"
                ),
                "ai": (
                    "Microsoft Azure : AI-900 (Fondamental), DP-900 (Fondamental), AI-102 (Associé), DP-203 (Associé), DP-100 (Associé)\n"
                    "Amazon AWS     : CLF-C02 (Fondamental), DEA-C01 (Associé), MLS-C01 (Spécialité ML), DAS-C01 (Spécialité Data)"
                ),
            }
            certifications_disponibles = fallback_by_profile.get(profile, fallback_by_profile["cloud"])
        else:
            certifications_disponibles = "\n".join(certif_lines)

        # ── Construire le prompt final ───────────────────────────────────────
        prompt = PROMPT_ROADMAP.format(
            certifications_disponibles=certifications_disponibles,
            profile=profile,
            niveau=niveau,
            forces=", ".join(profile_data.get("strengths", [])),
            points_a_renforcer=", ".join(level_data.get("points_a_renforcer", [])),
            premiere_certif=profile_data.get("recommended_first_certification", ""),
            score_pct=level_data.get("score", {}).get("pourcentage", 0),
        )

        lang_instruction = (
            "\n\nRédige ENTIÈREMENT en FRANÇAIS."
            if lang == "fr"
            else "\n\nWrite ENTIRELY in ENGLISH."
        )

        yield json.dumps({"chunk": "", "status": "reasoning"}) + "\n"
        full_roadmap = ""
        stream = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=[
                {"role": "system", "content": prompt + lang_instruction},
                {
                    "role": "user",
                    "content": (
                        f"Génère mon roadmap personnalisé. "
                        f"Profil: {profile} | Niveau: {niveau}"
                        if lang == "fr"
                        else f"Generate my personalized roadmap. "
                        f"Profile: {profile} | Level: {niveau}"
                    ),
                },
            ],
            stream=True,
            temperature=0.5,  # 🚀 Optimisation: Augmenté pour génération plus rapide
            max_tokens=2000,     # 🚀 Optimisation: Limiter tokens pour accélérer
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                full_roadmap += text
                yield json.dumps({"chunk": text, "status": "streaming"}) + "\n"

        yield json.dumps({"chunk": "", "status": "completed"}) + "\n"

        # Sauvegarder le roadmap en mémoire longue
        try:
            roadmap_json = json.loads(full_roadmap)
            phases_summary = " → ".join(
                p.get("phase_name", "") for p in roadmap_json.get("phases", [])
            )
            asyncio.create_task(
                self._memory.long.add_summary(
                    user_id,
                    f"Roadmap généré : {roadmap_json.get('roadmap_title', '')}. "
                    f"Phases : {phases_summary}. "
                    f"Durée totale : {roadmap_json.get('total_estimated_weeks', '?')} semaines.",
                    subject="Roadmap Certifications Généré",
                )
            )
        except (json.JSONDecodeError, Exception) as e:
            print(f" [Roadmap] Erreur sauvegarde mémoire : {e}")

    async def _stream_fallback_roadmap(self, template: dict, lang: str = "fr"):
        """Stream un template de roadmap pré-généré pour réponse rapide."""
        print(f"   🚀 STREAMING TEMPLATE FALLBACK")
        
        # Simuler le streaming pour le frontend
        roadmap_json = json.dumps(template, ensure_ascii=False)
        
        # Diviser en chunks pour simuler le streaming
        chunk_size = 200
        for i in range(0, len(roadmap_json), chunk_size):
            chunk = roadmap_json[i:i + chunk_size]
            yield json.dumps({"chunk": chunk, "status": "streaming"}) + "\n"
            await asyncio.sleep(0.05)  # Petite pause pour simuler le streaming
        
        yield json.dumps({"chunk": "", "status": "completed"}) + "\n"

    # ─────────────────────────────────────────────────────────────────────────
    # UTILITAIRE — Récupération du contexte mémoire longue
    # ─────────────────────────────────────────────────────────────────────────

    async def get_user_history(self, user_id: str) -> str:
        """Retourne le profil et l'historique long terme de l'utilisateur."""
        return await self._memory.long.get_context_for_prompt(user_id)
