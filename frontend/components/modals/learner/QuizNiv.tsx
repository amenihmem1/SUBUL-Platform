'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Server, Brain, Shield, ChevronRight, RotateCcw, Sparkles, CheckCircle, XCircle, ArrowLeft, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, API_PATHS } from '@/lib/api/client';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Domain = 'devops' | 'ai' | 'cyber';
type SavedQuizLevel = 'D\u00e9butant' | 'Interm\u00e9diaire' | 'Expert';

interface QuizOption {
  label: string;
  text: string;
  correct: boolean;
}

interface QuizQuestion {
  id: number;
  domain: Domain;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  options: QuizOption[];
  explanation: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DonnÃ©es statiques (Ã  complÃ©ter avec plus de questions)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALL_QUESTIONS: QuizQuestion[] = [
  // DevOps
  {
    id: 1,
    domain: 'devops',
    question: "Quel est le principe fondamental de DevOps ?",
    difficulty: "easy",
    points: 1,
    options: [
      { label: "A", text: "SÃ©paration stricte entre dev et ops", correct: false },
      { label: "B", text: "Collaboration et automatisation continue", correct: true },
      { label: "C", text: "Utilisation exclusive d'outils open-source", correct: false },
      { label: "D", text: "DÃ©veloppement sans tests automatisÃ©s", correct: false },
    ],
    explanation: "DevOps repose sur la collaboration entre dÃ©veloppement et opÃ©rations.",
  },
  {
    id: 2,
    domain: 'devops',
    question: "Quel outil est le plus utilisÃ© pour l'orchestration de conteneurs ?",
    difficulty: "medium",
    points: 2,
    options: [
      { label: "A", text: "Docker Swarm", correct: false },
      { label: "B", text: "Kubernetes", correct: true },
      { label: "C", text: "Nomad", correct: false },
      { label: "D", text: "Mesos", correct: false },
    ],
    explanation: "Kubernetes domine largement le marchÃ© de lâ€™orchestration en 2025.",
  },
  {
  id: 3,
  domain: 'devops',
  question: "Quelle est la principale diffÃ©rence entre CI et CD ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "CI dÃ©ploie en production, CD compile le code", correct: false },
    { label: "B", text: "CI intÃ¨gre le code, CD automatise le dÃ©ploiement", correct: true },
    { label: "C", text: "CI est manuel, CD est automatique", correct: false },
    { label: "D", text: "Il n'y a aucune diffÃ©rence", correct: false },
  ],
  explanation: "CI = Continuous Integration (tests + build). CD = Continuous Delivery/Deployment.",
},
{
  id: 4,
  domain: 'devops',
  question: "Quel est le rÃ´le principal de Docker ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "CrÃ©er des machines virtuelles complÃ¨tes", correct: false },
    { label: "B", text: "Conteneuriser des applications avec leurs dÃ©pendances", correct: true },
    { label: "C", text: "Orchestrer plusieurs clusters", correct: false },
    { label: "D", text: "GÃ©rer les pipelines CI/CD", correct: false },
  ],
  explanation: "Docker permet dâ€™isoler une application dans un conteneur lÃ©ger.",
},
{
  id: 5,
  domain: 'devops',
  question: "Quel est l'objectif principal d'une infrastructure as code (IaC) ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Configurer les serveurs manuellement", correct: false },
    { label: "B", text: "Versionner et automatiser la gestion d'infrastructure", correct: true },
    { label: "C", text: "Supprimer les environnements de test", correct: false },
    { label: "D", text: "Ã‰viter l'utilisation du cloud", correct: false },
  ],
  explanation: "IaC permet de gÃ©rer lâ€™infrastructure comme du code versionnÃ©.",
},
{
  id: 6,
  domain: 'devops',
  question: "Quel outil est principalement utilisÃ© pour lâ€™IaC dÃ©clarative multi-cloud ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Ansible", correct: false },
    { label: "B", text: "Terraform", correct: true },
    { label: "C", text: "Jenkins", correct: false },
    { label: "D", text: "GitLab Runner", correct: false },
  ],
  explanation: "Terraform est un standard pour provisionner lâ€™infrastructure cloud.",
},
{
  id: 7,
  domain: 'devops',
  question: "Quel est le principe du Blue-Green Deployment ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Mettre Ã  jour directement la production", correct: false },
    { label: "B", text: "Maintenir deux environnements pour rÃ©duire les risques", correct: true },
    { label: "C", text: "Supprimer lâ€™environnement de staging", correct: false },
    { label: "D", text: "Tester uniquement en local", correct: false },
  ],
  explanation: "Deux environnements identiques permettent un switch sÃ©curisÃ©.",
},
{
  id: 8,
  domain: 'devops',
  question: "Quelle mÃ©trique fait partie des DORA Metrics ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "Nombre de dÃ©veloppeurs", correct: false },
    { label: "B", text: "Temps de rÃ©cupÃ©ration aprÃ¨s incident (MTTR)", correct: true },
    { label: "C", text: "Nombre de serveurs actifs", correct: false },
    { label: "D", text: "Volume de commits Git", correct: false },
  ],
  explanation: "Les DORA Metrics mesurent la performance DevOps (lead time, MTTR, etc.).",
},
{
  id: 9,
  domain: 'devops',
  question: "Quel est le rÃ´le dâ€™un service mesh comme Istio ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "GÃ©rer le code source", correct: false },
    { label: "B", text: "GÃ©rer la communication sÃ©curisÃ©e entre microservices", correct: true },
    { label: "C", text: "Compiler les applications", correct: false },
    { label: "D", text: "CrÃ©er des images Docker", correct: false },
  ],
  explanation: "Un service mesh gÃ¨re trafic, sÃ©curitÃ© et observabilitÃ© des microservices.",
},
{
  id: 10,
  domain: 'devops',
  question: "Quel outil est principalement utilisÃ© pour la surveillance et la collecte de mÃ©triques ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Prometheus", correct: true },
    { label: "B", text: "Postman", correct: false },
    { label: "C", text: "Webpack", correct: false },
    { label: "D", text: "Nginx", correct: false },
  ],
  explanation: "Prometheus est un standard pour la collecte de mÃ©triques.",
},
  

  // AI
  // AI questions â€” Ã  ajouter dans ALL_QUESTIONS

// Niveau easy (dÃ©butant)
{
  id: 101,
  domain: 'ai',
  question: "Que signifie le sigle LLM ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "Large Language Model", correct: true },
    { label: "B", text: "Low Latency Machine", correct: false },
    { label: "C", text: "Linear Learning Method", correct: false },
    { label: "D", text: "Local Logic Module", correct: false },
  ],
  explanation: "LLM signifie Large Language Model : les grands modÃ¨les de langage comme GPT, Llama, Mistral, etc.",
},

{
  id: 102,
  domain: 'ai',
  question: "Quel type d'apprentissage est utilisÃ© quand un modÃ¨le reÃ§oit des donnÃ©es Ã©tiquetÃ©es (avec rÃ©ponses correctes) ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "Apprentissage non supervisÃ©", correct: false },
    { label: "B", text: "Apprentissage supervisÃ©", correct: true },
    { label: "C", text: "Apprentissage par renforcement", correct: false },
    { label: "D", text: "Apprentissage auto-supervisÃ©", correct: false },
  ],
  explanation: "L'apprentissage supervisÃ© utilise des donnÃ©es avec labels (ex: chat vs chien sur des photos annotÃ©es).",
},

{
  id: 103,
  domain: 'ai',
  question: "Quel framework Python est le plus populaire en 2025 pour crÃ©er et entraÃ®ner des modÃ¨les de deep learning ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "Scikit-learn", correct: false },
    { label: "B", text: "PyTorch", correct: true },
    { label: "C", text: "Keras seul", correct: false },
    { label: "D", text: "XGBoost", correct: false },
  ],
  explanation: "PyTorch est devenu le framework dominant dans la recherche et de plus en plus en production.",
},

// Niveau medium (intermÃ©diaire)
{
  id: 201,
  domain: 'ai',
  question: "Quel phÃ©nomÃ¨ne survient quand un modÃ¨le apprend trop bien les donnÃ©es d'entraÃ®nement mais gÃ©nÃ©ralise trÃ¨s mal ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Underfitting", correct: false },
    { label: "B", text: "Overfitting", correct: true },
    { label: "C", text: "Data leakage", correct: false },
    { label: "D", text: "Vanishing gradient", correct: false },
  ],
  explanation: "L'overfitting signifie que le modÃ¨le mÃ©morise le bruit au lieu d'apprendre les vraies rÃ©gularitÃ©s.",
},

{
  id: 202,
  domain: 'ai',
  question: "Quelle technique est la plus couramment utilisÃ©e pour rÃ©duire l'overfitting sur de grands modÃ¨les de langage ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Augmentation massive des donnÃ©es", correct: false },
    { label: "B", text: "Fine-tuning + LoRA / QLoRA", correct: true },
    { label: "C", text: "Augmentation du nombre de couches", correct: false },
    { label: "D", text: "Suppression complÃ¨te du dropout", correct: false },
  ],
  explanation: "LoRA et QLoRA permettent un fine-tuning efficace et peu coÃ»teux des trÃ¨s grands modÃ¨les.",
},

{
  id: 203,
  domain: 'ai',
  question: "Dans le contexte des LLM, que signifie le terme \"prompt engineering\" ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Ã‰crire du code pour entraÃ®ner le modÃ¨le", correct: false },
    { label: "B", text: "Concevoir des instructions prÃ©cises pour obtenir de meilleurs rÃ©sultats", correct: true },
    { label: "C", text: "Compresser le modÃ¨le pour qu'il tienne sur un tÃ©lÃ©phone", correct: false },
    { label: "D", text: "Changer l'architecture du transformer", correct: false },
  ],
  explanation: "Le prompt engineering est l'art de formuler les bonnes questions/instructions pour maximiser la qualitÃ© des rÃ©ponses.",
},

// Niveau hard (avancÃ© / expert)
{
  id: 301,
  domain: 'ai',
  question: "Quelle est la principale limite thÃ©orique actuelle des architectures transformer classiques ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "ComplexitÃ© quadratique en fonction de la longueur de sÃ©quence", correct: true },
    { label: "B", text: "IncapacitÃ© Ã  faire du raisonnement multi-Ã©tapes", correct: false },
    { label: "C", text: "Absence totale de mÃ©moire Ã  long terme", correct: false },
    { label: "D", text: "Impossible Ã  parallÃ©liser", correct: false },
  ],
  explanation: "La complexitÃ© O(nÂ²) en attention rend les transformers trÃ¨s coÃ»teux sur de trÃ¨s longues sÃ©quences.",
},

{
  id: 302,
  domain: 'ai',
  question: "Quel mÃ©canisme est au cÅ“ur des architectures Mamba et des State Space Models modernes ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "Selective State Space (S6 / Mamba)", correct: true },
    { label: "B", text: "Flash Attention v3", correct: false },
    { label: "C", text: "Mixture of Experts (MoE) uniquement", correct: false },
    { label: "D", text: "Rotary Position Embedding (RoPE)", correct: false },
  ],
  explanation: "Mamba et les SSM modernes remplacent l'attention par un mÃ©canisme dâ€™Ã©tat sÃ©lectif beaucoup plus efficace.",
},

{
  id: 303,
  domain: 'ai',
  question: "En 2026, quelle approche est la plus prometteuse pour obtenir un raisonnement de niveau expert avec des LLM ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "Scaling laws uniquement (plus de paramÃ¨tres)", correct: false },
    { label: "B", text: "Test-time compute + o1-like chain-of-thought + search", correct: true },
    { label: "C", text: "Remplacer complÃ¨tement les transformers par des SSM", correct: false },
    { label: "D", text: "Supprimer les phases de prÃ©-entraÃ®nement", correct: false },
  ],
  explanation: "Les approches o1-style (raisonnement long + search/test-time compute) montrent les meilleurs rÃ©sultats actuels.",
},
  

  // Cyber questions â€” Ã  ajouter dans ALL_QUESTIONS

// Niveau easy (dÃ©butant)
{
  id: 201,
  domain: 'cyber',
  question: "Que reprÃ©sente le Â« I Â» dans la triade CIA ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "Integrity (IntÃ©gritÃ©)", correct: true },
    { label: "B", text: "Intelligence", correct: false },
    { label: "C", text: "Incident", correct: false },
    { label: "D", text: "Identity", correct: false },
  ],
  explanation: "CIA = Confidentiality (ConfidentialitÃ©), Integrity (IntÃ©gritÃ©), Availability (DisponibilitÃ©).",
},

{
  id: 202,
  domain: 'cyber',
  question: "Quel est le nom de l'attaque qui consiste Ã  envoyer de faux emails pour voler des identifiants ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "Phishing", correct: true },
    { label: "B", text: "DDoS", correct: false },
    { label: "C", text: "SQL Injection", correct: false },
    { label: "D", text: "Brute Force", correct: false },
  ],
  explanation: "Le phishing est l'attaque la plus courante visant Ã  tromper les utilisateurs pour obtenir leurs identifiants.",
},

{
  id: 203,
  domain: 'cyber',
  question: "Quel protocole sÃ©curisÃ© remplace HTTP pour chiffrer les communications web ?",
  difficulty: "easy",
  points: 1,
  options: [
    { label: "A", text: "HTTPS", correct: true },
    { label: "B", text: "FTP", correct: false },
    { label: "C", text: "SMTP", correct: false },
    { label: "D", text: "Telnet", correct: false },
  ],
  explanation: "HTTPS utilise TLS/SSL pour chiffrer les Ã©changes entre le navigateur et le serveur.",
},

// Niveau medium (intermÃ©diaire)
{
  id: 301,
  domain: 'cyber',
  question: "Quel est le principal objectif d'un pare-feu de type stateful ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Bloquer uniquement les ports connus", correct: false },
    { label: "B", text: "Suivre l'Ã©tat des connexions TCP et autoriser les rÃ©ponses", correct: true },
    { label: "C", text: "Chiffrer tout le trafic sortant", correct: false },
    { label: "D", text: "Analyser les signatures de malware uniquement", correct: false },
  ],
  explanation: "Un pare-feu stateful maintient une table d'Ã©tats pour autoriser le trafic de retour lÃ©gitime.",
},

{
  id: 302,
  domain: 'cyber',
  question: "Quelle est la meilleure pratique pour stocker les mots de passe dans une base de donnÃ©es ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Hachage avec sel + algorithme bcrypt / Argon2", correct: true },
    { label: "B", text: "Chiffrement symÃ©trique AES", correct: false },
    { label: "C", text: "Stockage en clair avec obfuscation", correct: false },
    { label: "D", text: "Hachage MD5 sans sel", correct: false },
  ],
  explanation: "Bcrypt, Argon2 ou PBKDF2 avec sel unique par utilisateur sont les standards actuels.",
},

{
  id: 303,
  domain: 'cyber',
  question: "Qu'est-ce qu'une attaque de type \"Man-in-the-Middle\" (MitM) ?",
  difficulty: "medium",
  points: 2,
  options: [
    { label: "A", text: "Interception et modification du trafic entre deux parties", correct: true },
    { label: "B", text: "Envoi massif de requÃªtes pour saturer un serveur", correct: false },
    { label: "C", text: "Injection de code dans une requÃªte SQL", correct: false },
    { label: "D", text: "Deviner un mot de passe par essais rÃ©pÃ©tÃ©s", correct: false },
  ],
  explanation: "Une attaque MitM place l'attaquant entre la victime et le serveur pour espionner ou altÃ©rer les Ã©changes.",
},

// Niveau hard (avancÃ© / expert)
{
  id: 401,
  domain: 'cyber',
  question: "Quelle est la principale diffÃ©rence entre un RCE et un LPE ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "RCE = exÃ©cution de code Ã  distance, LPE = Ã©lÃ©vation de privilÃ¨ges local", correct: true },
    { label: "B", text: "RCE = lecture seule, LPE = Ã©criture seule", correct: false },
    { label: "C", text: "RCE = client-side, LPE = server-side", correct: false },
    { label: "D", text: "Aucune diffÃ©rence significative", correct: false },
  ],
  explanation: "Remote Code Execution (RCE) permet d'exÃ©cuter du code Ã  distance, Local Privilege Escalation (LPE) Ã©lÃ¨ve les droits sur une machine dÃ©jÃ  compromise.",
},

{
  id: 402,
  domain: 'cyber',
  question: "Dans le cadre de Zero Trust, quelle est la rÃ¨gle fondamentale concernant l'accÃ¨s ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "Never trust, always verify (ne jamais faire confiance, toujours vÃ©rifier)", correct: true },
    { label: "B", text: "Faire confiance aux utilisateurs internes du rÃ©seau", correct: false },
    { label: "C", text: "Autoriser tout trafic chiffrÃ©", correct: false },
    { label: "D", text: "Bloquer uniquement les connexions depuis l'Ã©tranger", correct: false },
  ],
  explanation: "Zero Trust part du principe qu'aucun utilisateur ou appareil n'est intrinsÃ¨quement fiable, mÃªme Ã  l'intÃ©rieur du rÃ©seau.",
},

{
  id: 403,
  domain: 'cyber',
  question: "Quelle technique est couramment utilisÃ©e pour contourner les WAF modernes en 2025â€“2026 ?",
  difficulty: "hard",
  points: 3,
  options: [
    { label: "A", text: "HTTP/2 ou HTTP/3 smuggling + obfuscation JavaScript", correct: true },
    { label: "B", text: "Utilisation exclusive de GET au lieu de POST", correct: false },
    { label: "C", text: "Envoi de payloads uniquement en base64", correct: false },
    { label: "D", text: "Suppression totale des en-tÃªtes User-Agent", correct: false },
  ],
  explanation: "Les techniques de smuggling (HTTP/2 â†’ HTTP/1.1) combinÃ©es Ã  l'obfuscation permettent souvent de bypasser les signatures WAF.",
},
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Utilitaires
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getQuestionsByDomain(domain: Domain | null): QuizQuestion[] {
  if (!domain) return [];
  return ALL_QUESTIONS.filter(q => q.domain === domain);
}

function computeScore(answers: Record<number, string>, questions: QuizQuestion[]) {
  let score = 0;
  let totalPoints = 0;

  questions.forEach(q => {
    totalPoints += q.points;
    const selected = answers[q.id];
    const correct = q.options.find(o => o.correct)?.label;
    if (selected === correct) score += q.points;
  });

  return { score, total: totalPoints, percentage: totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0 };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ã‰cran dâ€™accueil / Choix du domaine
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DomainChoiceScreenProps {
  onChoose: (domain: Domain) => void;
}

const DomainChoiceScreen = ({ onChoose }: DomainChoiceScreenProps) => (
  <div className="text-center py-12 px-6">
    <h1 className="text-3xl font-bold mb-8">Choisissez votre domaine</h1>
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <button
        onClick={() => onChoose('devops')}
        className="p-8 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-all flex flex-col items-center gap-4"
      >
        <Server className="h-12 w-12 text-emerald-600" />
        <div>
          <h3 className="text-xl font-semibold">DevOps</h3>
          <p className="text-sm text-gray-600 mt-1">CI/CD â€¢ IaC â€¢ Conteneurs â€¢ Cloud</p>
        </div>
      </button>

      <button
        onClick={() => onChoose('ai')}
        className="p-8 rounded-2xl border-2 border-violet-200 hover:border-violet-500 bg-violet-50 hover:bg-violet-100 transition-all flex flex-col items-center gap-4"
      >
        <Brain className="h-12 w-12 text-violet-600" />
        <div>
          <h3 className="text-xl font-semibold">Intelligence Artificielle</h3>
          <p className="text-sm text-gray-600 mt-1">ML â€¢ Deep Learning â€¢ LLM â€¢ GenAI</p>
        </div>
      </button>

      <button
        onClick={() => onChoose('cyber')}
        className="p-8 rounded-2xl border-2 border-rose-200 hover:border-rose-500 bg-rose-50 hover:bg-rose-100 transition-all flex flex-col items-center gap-4"
      >
        <Shield className="h-12 w-12 text-rose-600" />
        <div>
          <h3 className="text-xl font-semibold">CybersÃ©curitÃ©</h3>
          <p className="text-sm text-gray-600 mt-1">SÃ©curitÃ© â€¢ Pentest â€¢ SOC â€¢ Zero Trust</p>
        </div>
      </button>
    </div>
  </div>
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Question Screen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuestionScreen({
  question,
  current,
  total,
  onAnswer,
  onBack,
}: {
  question: QuizQuestion;
  current: number;
  total: number;
  onAnswer: (label: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full px-4 sm:px-6 py-5 sm:py-7 bg-gradient-to-b from-gray-50 to-white">
      {/* Barre de progression fluide */}
      <div className="mb-6 sm:mb-7">
        <div className="flex items-center justify-between mb-3 text-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors"
            disabled={current === 1}
          >
            <ArrowLeft className="h-4 w-4" />
            PrÃ©cÃ©dent
          </button>
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-500">
              Question {current} sur {total}
            </span>
            <span className="font-semibold text-indigo-600">
              {Math.round((current / total) * 100)}%
            </span>
          </div>
        </div>

        <div className="h-2.5 rounded-full bg-gray-100/70 backdrop-blur-sm overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-[600ms] ease-out"
            style={{
              width: `${(current / total) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
            }}
          />
        </div>
      </div>

      {/* NumÃ©ro + question */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-start gap-4 sm:gap-5">
          <div
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white text-2xl sm:text-3xl font-extrabold flex items-center justify-center shadow-xl shadow-indigo-500/20"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            }}
          >
            {current}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {question.difficulty === 'easy' ? 'Facile' :
                 question.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
              </span>
              <span className="px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                {question.points} points
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight pt-2 tracking-tight">
              {question.question}
            </h3>
          </div>
        </div>
      </div>

      {/* Cartes rÃ©ponses */}
      <div className="space-y-4 sm:space-y-5 flex-1">
        {question.options.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => onAnswer(opt.label)}
            className="
              group w-full text-left px-5 sm:px-6 py-5 sm:py-6 
              rounded-2xl border-2 border-gray-100/70 bg-white/75 backdrop-blur-md
              hover:border-indigo-400/60 hover:bg-indigo-50/40 
              hover:shadow-2xl hover:shadow-indigo-500/20
              active:scale-[0.98] transition-all duration-300
            "
          >
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Cercle lettre */}
              <div
                className="
                  flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl 
                  border-2 border-gray-200/60 group-hover:border-indigo-400/70
                  text-gray-500 group-hover:text-indigo-600
                  bg-white/80 group-hover:bg-indigo-50/50
                  text-lg sm:text-xl font-bold flex items-center justify-center
                  shadow-sm transition-all duration-300
                "
              >
                {opt.label}
              </div>

              {/* Texte */}
              <span className="text-base sm:text-lg font-medium text-gray-800 group-hover:text-gray-950 leading-snug flex-1">
                {opt.text}
              </span>

              {/* FlÃ¨che animÃ©e */}
              <ChevronRight
                className="
                  h-6 w-6 sm:h-7 sm:w-7 text-gray-300 
                  group-hover:text-indigo-500 group-hover:translate-x-2
                  transition-all duration-300
                "
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Results Screen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResultsScreen({
  answers,
  questions,
  selectedDomain,
  onReset,
}: {
  answers: Record<number, string>;
  questions: QuizQuestion[];
  selectedDomain: Domain | null;
  onReset: () => void;
}) {
  const { score, total, percentage } = computeScore(answers, questions);
  
  let level = "DÃ©butant";
  let levelColor = "text-green-600";
  let levelBg = "bg-green-100";
  if (percentage >= 75) {
    level = "Expert";
    levelColor = "text-purple-600";
    levelBg = "bg-purple-100";
  } else if (percentage >= 45) {
    level = "IntermÃ©diaire";
    levelColor = "text-blue-600";
    levelBg = "bg-blue-100";
  }

  const domainConfig = {
    devops: { name: 'DevOps', icon: Server, gradient: 'from-emerald-500 via-cyan-500 to-blue-500' },
    ai: { name: 'Intelligence Artificielle', icon: Brain, gradient: 'from-violet-500 via-purple-500 to-fuchsia-500' },
    cyber: { name: 'CybersÃ©curitÃ©', icon: Shield, gradient: 'from-rose-500 via-red-500 to-orange-500' },
  };

  const config = selectedDomain ? domainConfig[selectedDomain] : domainConfig.devops;
  const Icon = config.icon;
  const [saving, setSaving] = useState(false);

  const saveToProfile = async () => {
    if (!selectedDomain || saving) return;

    const apiLevel: SavedQuizLevel =
      percentage >= 75 ? 'Expert' : percentage >= 45 ? 'Interm\u00e9diaire' : 'D\u00e9butant';
    const quizData = {
      domain: selectedDomain,
      answers,
      questions: questions.map((q) => {
        const selected = answers[q.id];
        const correct = q.options.find((o) => o.correct)?.label;
        return {
          id: q.id,
          domain: q.domain,
          question: q.question,
          difficulty: q.difficulty,
          points: q.points,
          correct: selected === correct,
        };
      }),
      score: { score, total, percentage },
      level: apiLevel,
      timestamp: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await api.post(API_PATHS.quizResults('level'), quizData);
      localStorage.setItem('subul_quiz_result', JSON.stringify(quizData));
      alert('RÃ©sultats sauvegardÃ©s dans votre profil !');
    } catch (error) {
      console.error('Failed to save level quiz result', error);
      localStorage.setItem('subul_quiz_result', JSON.stringify(quizData));
      alert("RÃ©sultat gardÃ© localement, mais l'enregistrement profil a Ã©chouÃ©. VÃ©rifiez votre connexion/session.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-4">
      {/* Hero result card */}
      <div className={`relative rounded-3xl overflow-hidden p-8 shadow-2xl bg-gradient-to-br ${config.gradient} transform transition-all duration-500 hover:scale-[1.02]`}>
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-24 translate-x-24 blur-3xl bg-white/20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full translate-y-16 -translate-x-12 blur-2xl bg-white/15 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full -translate-y-1/2 -translate-x-1/2 blur-xl bg-white/10 animate-pulse delay-500" />
        
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 mx-auto mb-4">
            <Icon className="h-8 w-8 text-slate-800 drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">{config.name}</h2>
          <p className="text-lg text-slate-800 mb-6">Quiz de niveau terminÃ©</p>
          
          <div className="text-6xl font-black text-slate-900 mb-2">{percentage}%</div>
          <div className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${levelBg} ${levelColor} mb-4`}>
            {level}
          </div>
          <div className="text-slate-800">
            {score} / {total} points
          </div>
        </div>
      </div>

      {/* Questions review */}
      <div className="rounded-2xl p-6 border border-gray-100 bg-white shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center shadow-md">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          RÃ©vision des questions
        </h3>
        <div className="space-y-4">
          {questions.map(q => {
            const userAnswer = answers[q.id];
            const correctOpt = q.options.find(o => o.correct);
            const isCorrect = userAnswer === correctOpt?.label;

            return (
              <div key={q.id} className="border-l-4 pl-4 py-3 rounded-r-lg bg-gray-50" style={{ borderColor: isCorrect ? '#10b981' : '#ef4444' }}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.difficulty === 'easy' ? 'Facile' :
                         q.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                      </span>
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                        {q.points} points
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className={isCorrect ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        Votre rÃ©ponse : {userAnswer || "â€”"} 
                      </span>
                      {!isCorrect && (
                        <span className="ml-2 text-green-600 font-medium">
                          â†’ Bonne rÃ©ponse : {correctOpt?.label}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pb-2">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg transition-all duration-300 group"
        >
          <RotateCcw className="h-5 w-5 text-gray-500 group-hover:text-gray-700 group-hover:rotate-180 transition-transform" />
          <span>Recommencer</span>
        </button>
        <button
          onClick={saveToProfile}
          disabled={saving || !selectedDomain}
          className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group disabled:cursor-not-allowed disabled:opacity-70"
          style={{ background: `linear-gradient(135deg, #4f46e5, #7c3aed)` }}
        >
          <Star className="h-5 w-5 text-white group-hover:rotate-180 transition-transform" />
          <span>{saving ? 'Sauvegarde...' : 'Ajouter à mon profil'}</span>
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Composant principal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LevelQuizModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LevelQuizModal({ open, onClose }: LevelQuizModalProps) {
  const [phase, setPhase] = useState<'choice' | 'quiz' | 'results'>('choice');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [animating, setAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const questions = getQuestionsByDomain(selectedDomain);
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase('choice');
        setSelectedDomain(null);
        setCurrentIndex(0);
        setAnswers({});
        setAnimating(false);
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentIndex, phase]);

  const reset = () => {
    setAnimating(true);
    setTimeout(() => {
      setPhase('choice');
      setSelectedDomain(null);
      setCurrentIndex(0);
      setAnswers({});
      setAnimating(false);
    }, 250);
  };

  const handleChooseDomain = (domain: Domain) => {
    setAnimating(true);
    setTimeout(() => {
      setSelectedDomain(domain);
      setPhase('quiz');
      setAnimating(false);
    }, 250);
  };

  const handleAnswer = (label: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: label }));

    setAnimating(true);
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setPhase('results');
      }
      setAnimating(false);
    }, 250);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setAnimating(false);
      }, 250);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={phase === 'quiz' ? undefined : onClose}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-2xl flex flex-col rounded-3xl shadow-2xl overflow-hidden bg-white"
        style={{ maxHeight: 'min(92vh, 900px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide">SUBUL Platform</p>
              <p className="text-sm font-bold text-gray-900">
                {phase === 'choice' && "Quiz de Niveau"}
                {phase === 'quiz' && `Quiz ${selectedDomain?.toUpperCase()}`}
                {phase === 'results' && "RÃ©sultats"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'quiz' && (
              <span className="text-xs text-gray-400 font-medium tabular-nums">
                {currentIndex + 1} / {questions.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {phase === 'choice' && <DomainChoiceScreen onChoose={handleChooseDomain} />}
          {phase === 'quiz' && currentQuestion && (
            <QuestionScreen
              question={currentQuestion}
              current={currentIndex + 1}
              total={questions.length}
              onAnswer={handleAnswer}
              onBack={handleBack}
            />
          )}
          {phase === 'results' && (
            <ResultsScreen
              answers={answers}
              questions={questions}
              selectedDomain={selectedDomain}
              onReset={reset}
            />
          )}
        </div>

        {/* Footer hint on quiz */}
        {phase === 'quiz' && (
          <div className="flex-shrink-0 px-6 py-3 flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">Cliquez sur une rÃ©ponse pour avancer automatiquement</span>
          </div>
        )}
      </div>
    </div>
  );
}
