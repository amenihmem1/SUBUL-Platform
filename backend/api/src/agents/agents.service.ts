import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import axios, { AxiosError, type AxiosInstance } from 'axios';

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import FormData from 'form-data';

import { Readable } from 'stream';

import { JobsService } from '../jobs/jobs.service';
import { Job } from '../jobs/entities/job.entity';
import { UserAgentState } from './entities/user-agent-state.entity';
import { UserCv } from '../user-cv/entities/user-cv.entity';

import { getAgentUrls } from '../config/agents.config';
import { AgentQuotaService } from '../platform/agent-quota.service';
import { AGENT_KEYS } from '../common/constants';



export interface CvPlatformData {

  quiz: { domain: string; score: number; level: string; description?: string } | null;

  labs: Array<{ id: string; title: string; date: string; score?: number }>;

  certifications: Array<{ id: string; title: string; org: string; date: string }>;

  /** Recommended labs for CV Boost (from DB by domain/availability) */
  recommendedLabs?: Array<{ id: string; title: string; slug?: string; provider?: string; difficulty?: string; estimatedTime?: string }>;

  /** Recommended certifications for CV Boost (from DB by domain) */
  recommendedCertifications?: Array<{ id: number; title: string; provider?: string; domain?: string; description?: string }>;

}

export interface CvStatusResponse {
  hasCv: boolean;
  status: 'ready' | 'processing' | 'error' | 'missing';
  lastUploadedAt?: string | null;
  fileName?: string | null;
  cvPreview?: {
    role?: string | null;
    yearsExp?: string | null;
    domain?: string | null;
    skillsCount?: number;
  } | null;
}

export interface CvDocumentResponse {
  exists: boolean;
  hasContent: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  linkedin?: string;
  role?: string;
  seniority?: string;
  years_exp?: string;
  industry?: string;
  education?: string;
  skills?: string;
  summary?: string;
  bullets?: string;
  languages?: string;
  cv_file_name?: string;
  updated_at?: string;
  full_text?: string;
  full_text_truncated?: boolean;
}

type RoadmapDomain = 'cloud' | 'cyber' | 'ai';

interface RoadmapAssessQuestion {
  id: number;
  question: string;
  options: Record<'A' | 'B' | 'C', string>;
  domain_mapping: Record<'A' | 'B' | 'C', RoadmapDomain>;
}

interface RoadmapAssessProfile {
  profile: RoadmapDomain;
  confidence: number;
  scores: Record<RoadmapDomain, number>;
  hybrid: string | null;
  summary_fr: string;
  summary_en: string;
  strengths: string[];
  recommended_first_certification: string;
}

type RoadmapLevelDomain = 'devops' | 'cyber' | 'ai';

interface RoadmapLevelQuestion {
  id: number;
  domain: RoadmapLevelDomain;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  bonne_reponse: 'A' | 'B' | 'C' | 'D';
  explication: string;
  difficulte: 'easy' | 'medium' | 'hard';
  points: number;
}



/** User context sent to agents: platform data + other agents' state from user_agent_state */

export interface UserContextForAgents {

  user_id: number;

  platform: CvPlatformData;

  agent_state?: Record<string, Record<string, unknown>>;

}



/**

 * Proxies requests to Python agents with auth-validated user_id from NestJS DB.

 * Single source of truth: user_agent_state table + platform data; all traffic through Nest.

 */

@Injectable()

export class AgentsService {
  private readonly agentHttp: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    @InjectRepository(UserAgentState)

    private readonly userAgentStateRepo: Repository<UserAgentState>,

    @InjectRepository(UserCv)
    private readonly userCvRepo: Repository<UserCv>,

    private readonly agentQuotaService: AgentQuotaService,
  ) {
    /** Default matches AWS ALB max idle timeout (4000s); override via AGENT_HTTP_TIMEOUT_MS. */
    const defaultAgentTimeoutMs = 4_000_000;
    const raw = this.configService.get<string | number>('AGENT_HTTP_TIMEOUT_MS');
    const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? String(defaultAgentTimeoutMs)), 10);
    const timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultAgentTimeoutMs;

    const httpAgent = new HttpAgent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      keepAliveMsecs: 30_000,
    });
    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      keepAliveMsecs: 30_000,
    });

    this.agentHttp = axios.create({ timeout: timeoutMs, httpAgent, httpsAgent });
  }

  private async consumeAgent(userId: number, agentKey: string) {
    await this.agentQuotaService.assertAndConsume(userId, agentKey);
  }



  private getAgentUrls() {
    const env = process.env;
    // ConfigService.get() returns undefined for missing keys; do not overwrite Docker env with undefined
    // or Nest falls back to localhost:PORT inside the api container (wrong host for agent-roadmap, etc.).
    return getAgentUrls({
      ...env,
      NODE_ENV: this.configService.get<string>('NODE_ENV') ?? env.NODE_ENV,
      QUIZ_AGENT_URL: this.configService.get<string>('QUIZ_AGENT_URL') ?? env.QUIZ_AGENT_URL,
      ROADMAP_AGENT_URL: this.configService.get<string>('ROADMAP_AGENT_URL') ?? env.ROADMAP_AGENT_URL,
      CV_BOOSTER_URL: this.configService.get<string>('CV_BOOSTER_URL') ?? env.CV_BOOSTER_URL,
      CV_AGENT_URL: this.configService.get<string>('CV_AGENT_URL') ?? env.CV_AGENT_URL,
      CV_BOOSTER_AGENT_URL:
        this.configService.get<string>('CV_BOOSTER_AGENT_URL') ?? env.CV_BOOSTER_AGENT_URL,
      JOB_SEARCH_AGENT_URL:
        this.configService.get<string>('JOB_SEARCH_AGENT_URL') ?? env.JOB_SEARCH_AGENT_URL,
      COACH_AGENT_URL: this.configService.get<string>('COACH_AGENT_URL') ?? env.COACH_AGENT_URL,
      CLOUD_TUTOR_AGENT_URL:
        this.configService.get<string>('CLOUD_TUTOR_AGENT_URL') ?? env.CLOUD_TUTOR_AGENT_URL,
      AGENT03_API_URL: this.configService.get<string>('AGENT03_API_URL') ?? env.AGENT03_API_URL,
    });
  }



  private getQuizUrl(): string {

    return this.getAgentUrls().quiz || 'http://localhost:8001';

  }



  /** DEPRECATED: Use RoadmapAgent assessment questions instead */

  getAssessmentQuestions(): never {

    throw new HttpException('Static assessment questions deprecated. Use RoadmapAgent assessment endpoints instead.', 410);

  }

  private getRoadmapUrl(): string {

    return this.getAgentUrls().roadmap || 'http://localhost:8002';

  }

  private getCvUrl(): string {

    const raw = this.getAgentUrls().cvBooster || 'http://localhost:8005';
    const base = raw.replace(/\/$/, '');
    return base.endsWith('/api/cv') ? base : `${base}/api/cv`;

  }

  private getJobSearchUrl(): string {

    return this.getAgentUrls().jobSearch || 'http://localhost:8006';

  }

  private getCoachUrl(): string {

    return this.getAgentUrls().coach || 'http://localhost:8004';

  }

  private getCloudTutorUrl(): string {

    return this.getAgentUrls().cloudTutor || 'http://localhost:8000';

  }



  /** Get stored state for one user/agent. */

  async getState(userId: number, agentSlug: string): Promise<Record<string, unknown> | null> {

    const row = await this.userAgentStateRepo.findOne({ where: { userId, agentSlug } });

    return row?.payload ?? null;

  }



  /** Set (upsert) state for one user/agent. */

  async setState(userId: number, agentSlug: string, payload: Record<string, unknown>): Promise<void> {

    await this.userAgentStateRepo.upsert(

      { userId, agentSlug, payload: payload as object, updatedAt: new Date() },

      { conflictPaths: { userId: true, agentSlug: true } },

    );

  }



  /** Build user context for agents: platform data + other agents' state. */

  async getUserContextForAgents(userId: number, excludeAgent?: string): Promise<UserContextForAgents> {

    const platform = await this.getCvPlatformData(userId);

    const states = await this.userAgentStateRepo.find({ where: { userId } });

    const agent_state: Record<string, Record<string, unknown>> = {};

    for (const row of states) {

      if (row.agentSlug !== excludeAgent && row.payload) {

        agent_state[row.agentSlug] = row.payload as Record<string, unknown>;

      }

    }

    return { user_id: userId, platform, agent_state: Object.keys(agent_state).length ? agent_state : undefined };

  }



  /** Inject authenticated user_id and session_id into body. Overrides client values. */

  private enrichBody(body: Record<string, unknown>, userId: number): Record<string, unknown> {

    const enriched = { ...body };

    enriched.user_id = String(userId);

    if (!enriched.session_id || typeof enriched.session_id !== 'string') {

      enriched.session_id = `session_${userId}_${Date.now()}`;

    }

    return enriched;

  }



  private readonly logger = new Logger(AgentsService.name);

  private handleAxiosError(err: unknown, fallbackMessage: string): never {

    const status = err instanceof AxiosError && err.response ? err.response.status : 500;

    const message =

      err instanceof AxiosError && err.response

        ? (typeof err.response.data === 'string'

          ? err.response.data

          : Buffer.isBuffer(err.response.data)

            ? err.response.data.toString('utf-8')

            : err.response.data instanceof ArrayBuffer

              ? Buffer.from(err.response.data).toString('utf-8')

              : JSON.stringify(err.response.data)) || fallbackMessage

        : err instanceof Error
          ? err.message ||
            (err instanceof AxiosError ? (err.code ? String(err.code) : '') : '') ||
            fallbackMessage
          : fallbackMessage;

    const safeMessage =
      typeof message === 'string' && message.trim().length > 0 ? message : fallbackMessage;

    const body = { statusCode: status, message: safeMessage, error: 'Agent Error' };

    this.logger.warn(`${fallbackMessage}: ${safeMessage} (${status})`);

    throw new HttpException(body, status);

  }

  private isAgentUnavailable(err: unknown): boolean {
    if (!(err instanceof AxiosError)) {
      return false;
    }

    return (
      !err.response &&
      ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ERR_NETWORK'].includes(String(err.code ?? ''))
    );
  }

  private shouldUseRoadmapFallback(err: unknown): boolean {
    if (!(err instanceof AxiosError)) {
      return false;
    }

    const status = err.response?.status;
    return this.isAgentUnavailable(err) || (typeof status === 'number' && status >= 500);
  }

  private getFallbackRoadmapAssessQuestions(): { questions: RoadmapAssessQuestion[] } {
    const domain_mapping = { A: 'cloud', B: 'cyber', C: 'ai' } as const;

    return {
      questions: [
        {
          id: 1,
          question: 'Quel type de projet vous motive le plus ?',
          options: {
            A: 'Automatiser un deploiement fiable et scalable',
            B: 'Proteger une application contre les attaques',
            C: 'Construire un assistant intelligent avec des donnees',
          },
          domain_mapping,
        },
        {
          id: 2,
          question: 'Face a un probleme technique, vous preferez commencer par...',
          options: {
            A: 'Structurer l infrastructure et les environnements',
            B: 'Identifier les risques, failles et controles',
            C: 'Analyser les donnees et tester un modele',
          },
          domain_mapping,
        },
        {
          id: 3,
          question: 'Quel resultat aimeriez-vous savoir produire rapidement ?',
          options: {
            A: 'Une application deployee avec CI/CD',
            B: 'Un audit de securite clair et actionnable',
            C: 'Une prediction ou recommandation utile',
          },
          domain_mapping,
        },
        {
          id: 4,
          question: 'Quelle activite vous semble la plus naturelle ?',
          options: {
            A: 'Configurer serveurs, conteneurs et monitoring',
            B: 'Enqueter sur des incidents et durcir les acces',
            C: 'Experimenter avec prompts, datasets et evaluation',
          },
          domain_mapping,
        },
      ],
    };
  }

  private getFallbackRoadmapAssessProfile(body: Record<string, unknown>): RoadmapAssessProfile {
    const scores: Record<RoadmapDomain, number> = { cloud: 0, cyber: 0, ai: 0 };
    const history = Array.isArray(body.history) ? body.history : [];

    for (const item of history) {
      if (!item || typeof item !== 'object' || (item as { role?: unknown }).role !== 'user') {
        continue;
      }

      const content = String((item as { content?: unknown }).content ?? '').trim().toUpperCase();
      const answer = content.match(/^([ABC])\)/)?.[1];
      if (answer === 'A') scores.cloud += 1;
      if (answer === 'B') scores.cyber += 1;
      if (answer === 'C') scores.ai += 1;
    }

    const total = scores.cloud + scores.cyber + scores.ai || 1;
    scores.cloud = Math.round((scores.cloud / total) * 100);
    scores.cyber = Math.round((scores.cyber / total) * 100);
    scores.ai = Math.max(0, 100 - scores.cloud - scores.cyber);

    const profile = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'cloud') as RoadmapDomain;
    const confidence = scores[profile] / 100;
    const labels: Record<RoadmapDomain, string> = {
      cloud: 'Cloud & DevOps',
      cyber: 'Cybersecurite',
      ai: 'Intelligence Artificielle',
    };
    const firstCertifications: Record<RoadmapDomain, string> = {
      cloud: 'AWS Cloud Practitioner',
      cyber: 'CompTIA Security+',
      ai: 'Microsoft Azure AI Fundamentals',
    };

    return {
      profile,
      confidence,
      scores,
      hybrid: null,
      summary_fr: `Votre profil principal est ${labels[profile]}. Cette detection locale permet de continuer le parcours pendant que l agent roadmap est indisponible.`,
      summary_en: `Your primary profile is ${labels[profile]}. This local detection keeps the journey available while the roadmap agent is unavailable.`,
      strengths: [
        'Orientation pratique',
        'Capacite a choisir une piste technique',
        'Base suffisante pour demarrer un parcours guide',
      ],
      recommended_first_certification: firstCertifications[profile],
    };
  }

  private normalizeLevelDomain(profile: unknown): RoadmapLevelDomain {
    const value = String(profile ?? '').toLowerCase();
    if (value === 'ai' || value.includes('intelligence')) return 'ai';
    if (value === 'cyber' || value.includes('security') || value.includes('secur')) return 'cyber';
    return 'devops';
  }

  private getFallbackRoadmapLevelQuestions(body: Record<string, unknown>): { questions: RoadmapLevelQuestion[] } {
    const domain = this.normalizeLevelDomain(body.profile ?? body.domain);
    const banks: Record<RoadmapLevelDomain, RoadmapLevelQuestion[]> = {
      devops: [
        {
          id: 101,
          domain: 'devops',
          question: 'Quel est le role principal de Docker dans une chaine DevOps ?',
          options: {
            A: 'Virtualiser le materiel physique',
            B: 'Emballer une application et ses dependances dans un conteneur',
            C: 'Remplacer Git pour le versioning',
            D: 'Superviser uniquement les couts cloud',
          },
          bonne_reponse: 'B',
          explication: 'Docker permet de livrer une application avec ses dependances dans un environnement reproductible.',
          difficulte: 'easy',
          points: 1,
        },
        {
          id: 102,
          domain: 'devops',
          question: 'Dans un pipeline CI/CD, que signifie principalement CI ?',
          options: { A: 'Continuous Integration', B: 'Cloud Infrastructure', C: 'Container Inspection', D: 'Code Isolation' },
          bonne_reponse: 'A',
          explication: 'La CI automatise integration, tests et validation du code a chaque changement.',
          difficulte: 'easy',
          points: 1,
        },
        {
          id: 103,
          domain: 'devops',
          question: 'Quel objet Kubernetes expose habituellement des pods via une adresse stable ?',
          options: { A: 'Secret', B: 'ConfigMap', C: 'Service', D: 'Namespace' },
          bonne_reponse: 'C',
          explication: 'Un Service Kubernetes fournit un point d acces stable vers un ensemble de pods.',
          difficulte: 'medium',
          points: 2,
        },
        {
          id: 104,
          domain: 'devops',
          question: 'Quel principe Terraform aide a prevoir les changements avant application ?',
          options: { A: 'terraform fmt', B: 'terraform plan', C: 'terraform destroy', D: 'terraform output' },
          bonne_reponse: 'B',
          explication: 'terraform plan montre les modifications prevues avant de modifier l infrastructure.',
          difficulte: 'medium',
          points: 2,
        },
        {
          id: 105,
          domain: 'devops',
          question: 'Quelle pratique reduit le mieux le risque lors d un deploiement production ?',
          options: {
            A: 'Deployer manuellement sans tests',
            B: 'Supprimer les logs pour accelerer',
            C: 'Utiliser des tests automatises et un rollback documente',
            D: 'Changer directement la base en production',
          },
          bonne_reponse: 'C',
          explication: 'Tests automatises, monitoring et rollback rendent un deploiement plus controlable.',
          difficulte: 'hard',
          points: 3,
        },
      ],
      cyber: [
        {
          id: 201,
          domain: 'cyber',
          question: 'Quel est l objectif principal du principe du moindre privilege ?',
          options: {
            A: 'Donner tous les droits aux administrateurs',
            B: 'Limiter les droits au strict necessaire',
            C: 'Supprimer les mots de passe',
            D: 'Desactiver les journaux',
          },
          bonne_reponse: 'B',
          explication: 'Le moindre privilege reduit l impact d une compromission ou d une erreur.',
          difficulte: 'easy',
          points: 1,
        },
        {
          id: 202,
          domain: 'cyber',
          question: 'Quelle attaque vise a faire executer du SQL non desire par une application ?',
          options: { A: 'Phishing', B: 'SQL injection', C: 'DDoS', D: 'Brute force DNS' },
          bonne_reponse: 'B',
          explication: 'Une injection SQL exploite une entree mal controlee pour modifier une requete.',
          difficulte: 'easy',
          points: 1,
        },
        {
          id: 203,
          domain: 'cyber',
          question: 'Quel controle aide le plus contre le vol de mot de passe seul ?',
          options: { A: 'MFA', B: 'Nom de domaine court', C: 'Compression HTTP', D: 'Cache navigateur' },
          bonne_reponse: 'A',
          explication: 'Le MFA ajoute un facteur supplementaire au mot de passe.',
          difficulte: 'medium',
          points: 2,
        },
        {
          id: 204,
          domain: 'cyber',
          question: 'Dans une analyse d incident, quelle action vient en premier ?',
          options: {
            A: 'Effacer les traces',
            B: 'Identifier et contenir la menace',
            C: 'Publier tous les secrets',
            D: 'Desactiver definitivement le SI',
          },
          bonne_reponse: 'B',
          explication: 'La reponse incident commence par qualifier, contenir et preserver les elements utiles.',
          difficulte: 'medium',
          points: 2,
        },
        {
          id: 205,
          domain: 'cyber',
          question: 'Quel signal indique le mieux un risque de compromission de compte ?',
          options: {
            A: 'Connexion inhabituelle depuis un pays nouveau avec echec MFA',
            B: 'Changement de theme clair/sombre',
            C: 'Telechargement d une image publique',
            D: 'Lecture d une page FAQ',
          },
          bonne_reponse: 'A',
          explication: 'Une anomalie de localisation combinee a un echec MFA est un signal fort.',
          difficulte: 'hard',
          points: 3,
        },
      ],
      ai: [
        {
          id: 301,
          domain: 'ai',
          question: 'Quel est le but principal d un jeu de validation ?',
          options: {
            A: 'Entrainer le modele final uniquement',
            B: 'Evaluer le modele pendant le choix des hyperparametres',
            C: 'Remplacer les donnees de test',
            D: 'Stocker les prompts',
          },
          bonne_reponse: 'B',
          explication: 'Le jeu de validation aide a choisir et ajuster le modele sans toucher au test final.',
          difficulte: 'easy',
          points: 1,
        },
        {
          id: 302,
          domain: 'ai',
          question: 'Que mesure generalement la precision dans une classification ?',
          options: {
            A: 'La part des predictions positives qui sont correctes',
            B: 'La vitesse du GPU',
            C: 'La taille du dataset',
            D: 'Le nombre de couches uniquement',
          },
          bonne_reponse: 'A',
          explication: 'La precision compare les vrais positifs a toutes les predictions positives.',
          difficulte: 'easy',
          points: 1,
        },
        {
          id: 303,
          domain: 'ai',
          question: 'Quel probleme apparait quand un modele memorise trop les donnees d entrainement ?',
          options: { A: 'Underfitting', B: 'Overfitting', C: 'Normalisation', D: 'Tokenisation' },
          bonne_reponse: 'B',
          explication: 'L overfitting donne de bons resultats en entrainement mais generalise mal.',
          difficulte: 'medium',
          points: 2,
        },
        {
          id: 304,
          domain: 'ai',
          question: 'Dans un LLM, a quoi sert principalement le prompt engineering ?',
          options: {
            A: 'Formuler le contexte et les instructions pour guider la reponse',
            B: 'Modifier physiquement le processeur',
            C: 'Supprimer le modele',
            D: 'Changer le protocole TCP',
          },
          bonne_reponse: 'A',
          explication: 'Le prompt engineering structure la demande pour obtenir une sortie plus fiable.',
          difficulte: 'medium',
          points: 2,
        },
        {
          id: 305,
          domain: 'ai',
          question: 'Quelle pratique reduit le mieux le risque de fuite de donnees en IA generative ?',
          options: {
            A: 'Envoyer toutes les donnees sensibles au modele public',
            B: 'Anonymiser les donnees et appliquer des controles d acces',
            C: 'Ignorer les logs',
            D: 'Desactiver les tests',
          },
          bonne_reponse: 'B',
          explication: 'Anonymisation, controle d acces et gouvernance limitent les fuites de donnees.',
          difficulte: 'hard',
          points: 3,
        },
      ],
    };

    return { questions: banks[domain] };
  }

  private getFallbackRoadmapLevelEvaluation(body: Record<string, unknown>) {
    const questions = Array.isArray(body.questions)
      ? body.questions as Array<Record<string, unknown>>
      : this.getFallbackRoadmapLevelQuestions(body).questions;
    const answers = body.answers && typeof body.answers === 'object'
      ? body.answers as Record<string, unknown>
      : {};

    let obtained = 0;
    let total = 0;
    const strengths: string[] = [];
    const improvements: string[] = [];

    for (const [index, question] of questions.entries()) {
      const q = question as Record<string, unknown>;
      const id = String(q.id ?? index + 1);
      const correct = String(q.bonne_reponse ?? q.correct ?? '').trim();
      const selected = String(answers[id] ?? answers[String(index + 1)] ?? '').trim();
      const points = Number(q.points ?? 1);
      const safePoints = Number.isFinite(points) ? points : 1;
      total += safePoints;

      if (selected && correct && selected === correct) {
        obtained += safePoints;
        strengths.push(String(q.question ?? 'Question reussie'));
      } else {
        improvements.push(String(q.question ?? 'Question a renforcer'));
      }
    }

    const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
    const niveau = percentage >= 75 ? 'Expert' : percentage >= 45 ? 'Interm\u00e9diaire' : 'D\u00e9butant';

    return {
      niveau,
      score: { obtenu: obtained, total, pourcentage: percentage },
      analyse: `Evaluation locale terminee avec un score de ${percentage}%.`,
      points_forts: strengths.slice(0, 3),
      points_a_renforcer: improvements.slice(0, 3),
    };
  }

  private normalizeFallbackRoadmapProfile(profile: unknown): RoadmapDomain {
    const value = String(profile ?? '').toLowerCase();
    if (value === 'ai' || value.includes('intelligence') || value.includes('data')) return 'ai';
    if (value === 'cyber' || value.includes('security') || value.includes('secur')) return 'cyber';
    return 'cloud';
  }

  private normalizeFallbackRoadmapTier(niveau: unknown): 'Fondamental' | 'Associ\u00e9' | 'Expert' {
    const value = String(niveau ?? '').toLowerCase();
    if (value.includes('expert') || value.includes('advanced')) return 'Expert';
    if (value.includes('inter') || value.includes('associate') || value.includes('assoc')) return 'Associ\u00e9';
    return 'Fondamental';
  }

  private getFallbackRoadmapPayload(body: Record<string, unknown>) {
    const profile = this.normalizeFallbackRoadmapProfile(body.profile ?? body.domain);
    const userLevel = String(body.niveau ?? body.level ?? this.normalizeFallbackRoadmapTier(body.niveau));
    const currentTier = this.normalizeFallbackRoadmapTier(userLevel);

    const tracks = {
      cloud: {
        title: 'Roadmap Cloud & DevOps Azure/AWS',
        summary:
          'Parcours pratique pour consolider les bases cloud, manipuler les services essentiels et progresser vers une certification reconnue.',
        advice:
          'Commencez par une certification fondamentale, pratiquez chaque semaine avec un lab court, puis passez vers Kubernetes, Terraform et CI/CD.',
        phases: [
          {
            phase_number: 1,
            phase_name: 'Bases Cloud',
            phase_description: 'Comprendre les modeles cloud, les couts, la securite de base et les services essentiels.',
            duration_weeks: 4,
            level_tier: 'Fondamental',
            certifications: [
              {
                ordre: 1,
                nom: 'Microsoft Azure Fundamentals',
                code: 'AZ-900',
                provider: 'Microsoft',
                niveau_certif: 'Fondamental',
                duree_preparation_semaines: 4,
                heures_etude: 28,
                prerequis: ['Bases reseau', 'Notions systeme', 'Compte Azure gratuit'],
                pourquoi_cette_certif: 'Elle valide les fondamentaux Azure et correspond aux cours et labs AZ-900 disponibles.',
                competences_acquises: ['Cloud concepts', 'Azure core services', 'Pricing', 'Identity basics'],
                statut: currentTier === 'Fondamental' ? 'current' : 'upcoming',
                xp_reward: 250,
              },
              {
                ordre: 2,
                nom: 'AWS Certified Cloud Practitioner',
                code: 'CLF-C02',
                provider: 'AWS',
                niveau_certif: 'Fondamental',
                duree_preparation_semaines: 4,
                heures_etude: 30,
                prerequis: ['Bases cloud', 'Compte AWS Free Tier'],
                pourquoi_cette_certif: 'Elle complete Azure avec une vision AWS et prepare les labs EC2, S3, IAM et RDS.',
                competences_acquises: ['AWS global infrastructure', 'IAM', 'EC2 basics', 'Cost management'],
                statut: 'upcoming',
                xp_reward: 250,
              },
            ],
          },
          {
            phase_number: 2,
            phase_name: 'Infrastructure et deploiement',
            phase_description: 'Passer des bases aux deploiements reproductibles avec conteneurs, IaC et pipelines.',
            duration_weeks: 8,
            level_tier: 'Associ\u00e9',
            certifications: [
              {
                ordre: 3,
                nom: 'HashiCorp Certified: Terraform Associate',
                code: '003',
                provider: 'AWS',
                niveau_certif: 'Associ\u00e9',
                duree_preparation_semaines: 6,
                heures_etude: 45,
                prerequis: ['Bases cloud', 'Git', 'CLI'],
                pourquoi_cette_certif: 'Terraform structure les deploiements multi-cloud et relie directement les labs IaC.',
                competences_acquises: ['Infrastructure as Code', 'State management', 'Modules', 'Plan/apply workflow'],
                statut: currentTier === 'Associ\u00e9' ? 'current' : 'locked',
                xp_reward: 420,
              },
            ],
          },
        ],
      },
      cyber: {
        title: 'Roadmap Cybersecurite Azure/AWS',
        summary:
          'Parcours securite pour comprendre identite, gouvernance, supervision et protection des workloads cloud.',
        advice:
          'Validez les fondamentaux securite, puis pratiquez IAM, monitoring, Sentinel/Defender et durcissement cloud.',
        phases: [
          {
            phase_number: 1,
            phase_name: 'Fondamentaux securite',
            phase_description: 'Installer les bases: identite, controles d acces, risque, conformite et monitoring.',
            duration_weeks: 5,
            level_tier: 'Fondamental',
            certifications: [
              {
                ordre: 1,
                nom: 'Microsoft Security, Compliance, and Identity Fundamentals',
                code: 'SC-900',
                provider: 'Microsoft',
                niveau_certif: 'Fondamental',
                duree_preparation_semaines: 5,
                heures_etude: 32,
                prerequis: ['Bases cloud', 'Notions IAM'],
                pourquoi_cette_certif: 'Elle pose les bases securite Microsoft avant Defender, Sentinel et Entra ID.',
                competences_acquises: ['Zero Trust', 'Identity', 'Compliance', 'Security operations'],
                statut: currentTier === 'Fondamental' ? 'current' : 'upcoming',
                xp_reward: 280,
              },
              {
                ordre: 2,
                nom: 'AWS Certified Security - Specialty',
                code: 'SCS-C02',
                provider: 'AWS',
                niveau_certif: 'Sp\u00e9cialit\u00e9',
                duree_preparation_semaines: 10,
                heures_etude: 70,
                prerequis: ['IAM', 'Networking', 'CloudTrail', 'KMS'],
                pourquoi_cette_certif: 'Elle cible la securite AWS avancee apres les labs IAM, monitoring et reseau.',
                competences_acquises: ['IAM advanced', 'Incident response', 'KMS', 'Logging'],
                statut: 'locked',
                xp_reward: 650,
              },
            ],
          },
        ],
      },
      ai: {
        title: 'Roadmap IA & Cloud AI',
        summary:
          'Parcours IA pour progresser des services cognitifs et de l IA generative vers MLOps et deploiement cloud.',
        advice:
          'Travaillez les bases IA, pratiquez prompt engineering et evaluation, puis reliez vos projets aux services cloud.',
        phases: [
          {
            phase_number: 1,
            phase_name: 'Fondamentaux IA',
            phase_description: 'Comprendre ML, IA generative, donnees, evaluation et services AI cloud.',
            duration_weeks: 5,
            level_tier: 'Fondamental',
            certifications: [
              {
                ordre: 1,
                nom: 'Microsoft Azure AI Fundamentals',
                code: 'AI-900',
                provider: 'Microsoft',
                niveau_certif: 'Fondamental',
                duree_preparation_semaines: 5,
                heures_etude: 35,
                prerequis: ['Bases Python utiles', 'Notions donnees'],
                pourquoi_cette_certif: 'Elle valide les concepts IA et services Azure AI avant les projets pratiques.',
                competences_acquises: ['ML basics', 'Computer vision', 'NLP', 'Generative AI'],
                statut: currentTier === 'Fondamental' ? 'current' : 'upcoming',
                xp_reward: 300,
              },
              {
                ordre: 2,
                nom: 'AWS Certified AI Practitioner',
                code: 'AIF-C01',
                provider: 'AWS',
                niveau_certif: 'Fondamental',
                duree_preparation_semaines: 5,
                heures_etude: 35,
                prerequis: ['Bases cloud', 'Concepts IA'],
                pourquoi_cette_certif: 'Elle complete AI-900 avec les services IA AWS et une vision multi-cloud.',
                competences_acquises: ['AWS AI services', 'Responsible AI', 'Foundation models', 'Prompting'],
                statut: 'upcoming',
                xp_reward: 300,
              },
            ],
          },
        ],
      },
    } as const;

    const track = tracks[profile];
    const totalCertifications = track.phases.reduce((sum, phase) => sum + phase.certifications.length, 0);
    const totalWeeks = track.phases.reduce((sum, phase) => sum + phase.duration_weeks, 0);

    return {
      roadmap_title: track.title,
      roadmap_summary: track.summary,
      total_estimated_weeks: totalWeeks,
      total_certifications: totalCertifications,
      user_level: userLevel,
      phases: track.phases,
      conseil_final: track.advice,
      source: 'local-fallback',
    };
  }

  private createRoadmapFallbackStream(body: Record<string, unknown>): ReadableStream<Uint8Array> {
    const payload = JSON.stringify(this.getFallbackRoadmapPayload(body));
    const lines = [
      `${JSON.stringify({ chunk: payload })}\n`,
      `${JSON.stringify({ status: 'completed', source: 'local-fallback' })}\n`,
    ];
    return Readable.toWeb(Readable.from(lines)) as ReadableStream<Uint8Array>;
  }



  async proxyQuizGenerate(userId: number, body: Record<string, unknown>) {
    await this.consumeAgent(userId, AGENT_KEYS.QUIZ);
    const url = `${this.getQuizUrl()}/api/quiz/generate`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      this.handleAxiosError(err, 'Quiz agent error');

    }

  }



  async proxyQuizEvaluate(userId: number, body: Record<string, unknown>) {
    await this.consumeAgent(userId, AGENT_KEYS.QUIZ);
    const url = `${this.getQuizUrl()}/api/quiz/evaluate/sync`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      const data = res.data as Record<string, unknown>;

      if (data?.besoin_explication && data?.topic_pour_agent03 && this.getCloudTutorUrl()) {

        try {

          const explanation = await this.getCloudTutorExplanation(

            userId,

            String(data.topic_pour_agent03),

            (enriched.session_id as string) || undefined,

            (body.lang as string) || 'fr',

          );

          data.explication_agent03 = explanation;

        } catch {

          data.explication_agent03 = null;

        }

      }

      return data;

    } catch (err) {

      this.handleAxiosError(err, 'Quiz agent error');

    }

  }



  async proxyQuizSessionEnd(userId: number, body: { session_id?: string }) {
    await this.consumeAgent(userId, AGENT_KEYS.QUIZ);
    const url = `${this.getQuizUrl()}/api/quiz/session/end`;

    const enriched = this.enrichBody(body as Record<string, unknown>, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      this.handleAxiosError(err, 'Quiz agent error');

    }

  }



  async proxyRoadmapAssessQuestions(userId: number, body: Record<string, unknown>) {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/assess/questions`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      if (this.isAgentUnavailable(err)) {
        this.logger.warn('Roadmap agent unavailable; using local assessment questions fallback');
        return this.getFallbackRoadmapAssessQuestions();
      }

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  async proxyRoadmapAssessMessage(userId: number, body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/assess/message`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, {

        headers: { 'Content-Type': 'application/json' },

        responseType: 'stream',

      });

      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;

    } catch (err) {

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  async proxyRoadmapAssessAnalyze(userId: number, body: Record<string, unknown>) {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/assess/analyze`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      if (this.isAgentUnavailable(err)) {
        this.logger.warn('Roadmap agent unavailable; using local assessment analysis fallback');
        return this.getFallbackRoadmapAssessProfile(body);
      }

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  async proxyRoadmapLevelQuestions(userId: number, body: Record<string, unknown>) {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/level/questions`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      if (this.shouldUseRoadmapFallback(err)) {
        this.logger.warn('Roadmap agent unavailable; using local level questions fallback');
        return this.getFallbackRoadmapLevelQuestions(body);
      }

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  async proxyRoadmapLevelEvaluate(userId: number, body: Record<string, unknown>) {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/level/evaluate`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      if (this.shouldUseRoadmapFallback(err)) {
        this.logger.warn('Roadmap agent unavailable; using local level evaluation fallback');
        return this.getFallbackRoadmapLevelEvaluation(body);
      }

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  async proxyRoadmapGenerate(userId: number, body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/generate`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, {

        headers: { 'Content-Type': 'application/json' },

        responseType: 'stream',

      });

      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;

    } catch (err) {

      if (this.shouldUseRoadmapFallback(err)) {
        this.logger.warn('Roadmap agent unavailable; using local roadmap generation fallback');
        return this.createRoadmapFallbackStream(body);
      }

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  async proxyRoadmapSessionEnd(userId: number, body: { session_id?: string }) {
    await this.consumeAgent(userId, AGENT_KEYS.ROADMAP);
    const url = `${this.getRoadmapUrl()}/api/roadmap/session/end`;

    const enriched = this.enrichBody(body as Record<string, unknown>, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      this.handleAxiosError(err, 'Roadmap agent error');

    }

  }



  // ── CV Booster Agent ───────────────────────────────────────────────────────



  async getCvPlatformData(userId: number): Promise<CvPlatformData> {
    const url = `${this.getCvUrl()}/platform-data/${userId}`;
    try {
      const res = await this.agentHttp.get<CvPlatformData>(url, {
        headers: { 'Content-Type': 'application/json' },
      });
      return res.data;
    } catch (err) {
      this.handleAxiosError(err, 'CV Booster error');
    }
  }

  async getCvStatus(userId: number): Promise<CvStatusResponse> {
    const url = `${this.getCvUrl()}/cv-status/${userId}`;
    try {
      const res = await this.agentHttp.get(url, { responseType: 'json' });
      const data = (res.data ?? {}) as Record<string, unknown>;
      const rawStatus = String(data.status ?? 'missing');
      const allowedStatus: CvStatusResponse['status'][] = ['ready', 'processing', 'error', 'missing'];
      const status: CvStatusResponse['status'] = allowedStatus.includes(rawStatus as CvStatusResponse['status'])
        ? (rawStatus as CvStatusResponse['status'])
        : 'missing';

      return {
        hasCv: Boolean(data.hasCv),
        status,
        lastUploadedAt: data.lastUploadedAt ? String(data.lastUploadedAt) : null,
        fileName: data.fileName ? String(data.fileName) : null,
        cvPreview: typeof data.cvPreview === 'object' && data.cvPreview
          ? {
              role: (data.cvPreview as Record<string, unknown>).role
                ? String((data.cvPreview as Record<string, unknown>).role)
                : null,
              yearsExp: (data.cvPreview as Record<string, unknown>).yearsExp
                ? String((data.cvPreview as Record<string, unknown>).yearsExp)
                : null,
              domain: (data.cvPreview as Record<string, unknown>).domain
                ? String((data.cvPreview as Record<string, unknown>).domain)
                : null,
              skillsCount: Number((data.cvPreview as Record<string, unknown>).skillsCount ?? 0) || 0,
            }
          : null,
      };
    } catch (err) {
      // Degrade gracefully for learner emploi landing if CV agent is temporarily unavailable.
      if (err instanceof AxiosError && !err.response) {
        this.logger.warn(`CV status unavailable (fallback to missing): ${err.message}`);
        return {
          hasCv: false,
          status: 'missing',
          lastUploadedAt: null,
          fileName: null,
          cvPreview: null,
        };
      }
      this.handleAxiosError(err, 'CV status error');
    }
  }

  async getCvDocument(userId: number): Promise<CvDocumentResponse> {
    const url = `${this.getCvUrl()}/document/${userId}`;
    try {
      const res = await this.agentHttp.get(url, { responseType: 'json' });
      return res.data as CvDocumentResponse;
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        throw new HttpException(
          { exists: false, hasContent: false, message: 'No saved CV found' },
          HttpStatus.NOT_FOUND,
        );
      }
      if (err instanceof AxiosError && !err.response) {
        throw new HttpException('CV service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }
      this.handleAxiosError(err, 'CV document error');
    }
  }



  async getCertificationRecommendations(userId: number): Promise<{
    currentFocus: Array<{ title: string; provider: string; domain: string; difficulty?: string; urgency?: 'high' }>;
    strengths: Array<{ title: string; provider: string; domain: string; reason: string }>;
    suggestedTopics: Array<{ title: string; provider: string; domain: string; description?: string }>;
    estimatedCompletionTime: string;
  }> {
    const url = `${this.getCvUrl()}/api/roadmap/certification-recommendations`;
    try {
      const res = await this.agentHttp.get<{
        currentFocus: Array<{ title: string; provider: string; domain: string; difficulty?: string; urgency?: 'high' }>;
        strengths: Array<{ title: string; provider: string; domain: string; reason: string }>;
        suggestedTopics: Array<{ title: string; provider: string; domain: string; description?: string }>;
        estimatedCompletionTime: string;
      }>(url, {
        params: { user_id: String(userId) },
        headers: { 'Content-Type': 'application/json' },
      });
      return res.data;
    } catch (err) {
      this.handleAxiosError(err, 'CV Booster error');
    }
  }

  async proxyCvBoost(userId: number, file: { buffer: Buffer; mimetype: string; originalname: string } | undefined, body: Record<string, string>): Promise<Record<string, unknown>> {
    await this.consumeAgent(userId, AGENT_KEYS.CV);
    const url = `${this.getCvUrl()}/boost-cv`;

    const platformData = await this.getCvPlatformData(userId);

    const form = new FormData();

    if (file?.buffer) {
      form.append('file', file.buffer, { filename: file.originalname || 'cv', contentType: file.mimetype });
    } else {
      // No file uploaded — fetch the stored CV text and pass it as a text buffer
      try {
        const doc = await this.getCvDocument(userId);
        const cvText: string = (doc as any)?.cv_full_text || (doc as any)?.full_text || (doc as any)?.text || '';
        if (cvText) {
          form.append('file', Buffer.from(cvText, 'utf-8'), { filename: 'cv.txt', contentType: 'text/plain' });
        }
      } catch {
        // No stored CV — agent will attempt to fetch from Cosmos by user_id
        this.logger.warn(`proxyCvBoost: no stored CV document for user ${userId}, proceeding without file`);
      }
    }

    form.append('user_id', String(userId));

    form.append('cv_format', body.cv_format || 'ats');

    form.append('include_quiz', body.include_quiz ?? 'true');

    form.append('include_labs', body.include_labs ?? '[]');

    form.append('include_certs', body.include_certs ?? '[]');

    form.append('extra_data', body.extra_data ?? '{}');

    form.append('skipped_sections', body.skipped_sections ?? '[]');

    form.append('source_fidelity', body.source_fidelity ?? 'true');

    form.append('platform_data', JSON.stringify(platformData));

    const targetJobRaw = typeof body.target_job === 'string' && body.target_job.trim() ? body.target_job.trim() : '{}';
    form.append('target_job', targetJobRaw);



    try {
      const res = await this.agentHttp.post(url, form, {
        headers: form.getHeaders(),
        responseType: 'arraybuffer', // agent returns binary DOCX, not JSON
      });

      // The agent returns the DOCX in the body and CV metadata in response headers.
      const headers = res.headers as Record<string, string>;

      const parsedCvStr   = headers['x-parsed-cv']        || '';
      const atsScoreBefore = Number(headers['x-ats-score-before'] || 0);
      const atsScoreAfter  = Number(headers['x-ats-score-after']  || 0);
      const domain         = headers['x-domain'] || '';
      const contentDisp    = headers['content-disposition'] || '';
      const fileNameMatch  = /filename="([^"]+)"/.exec(contentDisp);
      const fileName       = fileNameMatch ? fileNameMatch[1] : 'CV.docx';

      // Base64-encode the DOCX so the frontend can offer an immediate download
      const docxBase64 = Buffer.from(res.data as ArrayBuffer).toString('base64');

      // Safely parse JSON headers (may be very large — use try/catch per field)
      let keywordsMatched: string[] = [];
      let missingSections: string[] = [];
      let atsBreakdownAfter: Record<string, unknown> = {};
      let parsedCvObj: Record<string, unknown> = {};

      try { keywordsMatched  = JSON.parse(headers['x-keywords-matched']    || '[]'); } catch { /* noop */ }
      try { missingSections  = JSON.parse(headers['x-missing-sections']    || '[]'); } catch { /* noop */ }
      try { atsBreakdownAfter = JSON.parse(headers['x-ats-breakdown-after'] || '{}'); } catch { /* noop */ }
      try { parsedCvObj = parsedCvStr ? JSON.parse(parsedCvStr) : {}; } catch { /* noop */ }

      // Update PostgreSQL user_cvs with boosted CV data so subsequent scans use current CV
      try {
        const extractedData = this.sanitizeCvExtractedData(parsedCvObj);
        // Merge in additional fields from the boost response
        if (domain) extractedData['domain'] = domain;
        if (typeof atsScoreAfter === 'number' && atsScoreAfter > 0) extractedData['ats_score'] = atsScoreAfter;

        await this.userCvRepo.upsert(
          {
            userId,
            fileName,
            extractedData,
            atsScore: typeof atsScoreAfter === 'number' ? atsScoreAfter : undefined,
            lastAnalyzedAt: new Date(),
          } as any,
          { conflictPaths: ['userId'] },
        );
        this.logger.log(`Updated PostgreSQL user_cvs for user ${userId} after CV boost (ats: ${atsScoreBefore}→${atsScoreAfter})`);
      } catch (err) {
        this.logger.warn(`Failed to update PostgreSQL user_cvs for user ${userId} after boost: ${(err as Error).message}`);
      }

      return {
        parsed_cv:          parsedCvStr,    // JSON string — pass to /apply-format for alternate formats
        docx_base64:        docxBase64,      // ATS DOCX ready for direct download
        file_name:          fileName,
        ats_score_before:   atsScoreBefore,
        ats_score_after:    atsScoreAfter,
        domain,
        keywords_matched:   keywordsMatched,
        missing_sections:   missingSections,
        ats_breakdown_after: atsBreakdownAfter,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.handleAxiosError(err, 'CV Booster error');
    }
  }



  async proxyCvApplyFormat(userId: number, parsedCv: string, cvFormat: string, photoBase64?: string): Promise<Buffer> {
    await this.consumeAgent(userId, AGENT_KEYS.CV);
    const url = `${this.getCvUrl()}/apply-format`;

    const form = new FormData();

    form.append('parsed_cv', parsedCv);

    form.append('cv_format', cvFormat);

    if (photoBase64) form.append('photo_base64', photoBase64);



    try {

      const res = await this.agentHttp.post(url, form, {

        headers: form.getHeaders(),

        responseType: 'arraybuffer',

      });

      return Buffer.from(res.data as ArrayBuffer);

    } catch (err) {

      this.handleAxiosError(err, 'CV Booster error');

    }

  }

  async proxyCvExtract(userId: number, file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<Record<string, unknown>> {
    await this.consumeAgent(userId, AGENT_KEYS.CV);
    const url = `${this.getCvUrl()}/extract-cv`;

    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname || 'file', contentType: file.mimetype });

    try {
      const res = await this.agentHttp.post(url, form, {
        headers: form.getHeaders(),
        responseType: 'json',
      });
      return res.data as Record<string, unknown>;
    } catch (err) {
      this.handleAxiosError(err, 'CV Booster error');
    }
  }

  async proxyCvSave(userId: number, file: { buffer: Buffer; mimetype: string; originalname: string }, body: Record<string, string>): Promise<Record<string, unknown>> {
    await this.consumeAgent(userId, AGENT_KEYS.CV);
    const url = `${this.getCvUrl()}/save-cv`;

    const platformData = await this.getCvPlatformData(userId);

    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname || 'file', contentType: file.mimetype });
    form.append('user_id', String(userId));
    form.append('quiz_data', body.quiz_data || 'null');
    form.append('labs_data', body.labs_data || '[]');
    form.append('certs_data', body.certs_data || '[]');
    form.append('extra_data', body.extra_data || '{}');
    form.append('platform_data', JSON.stringify(platformData));

    try {
      const res = await this.agentHttp.post(url, form, {
        headers: form.getHeaders(),
        responseType: 'arraybuffer', // Python boost_cv returns DOCX binary + metadata in headers
      });

      // Parse response headers (same format as proxyCvBoost)
      const headers = res.headers as Record<string, string>;
      const parsedCvStr = headers['x-parsed-cv'] || '';
      const atsScoreBefore = Number(headers['x-ats-score-before'] || 0);
      const atsScoreAfter = Number(headers['x-ats-score-after'] || 0);
      const domain = headers['x-domain'] || '';

      let parsedCvObj: Record<string, unknown> = {};
      try { parsedCvObj = parsedCvStr ? JSON.parse(parsedCvStr) : {}; } catch { /* noop */ }

      // Update PostgreSQL user_cvs with the new CV's extracted data
      // so that subsequent job scans use the current (replaced) CV
      try {
        const extractedData = this.sanitizeCvExtractedData(parsedCvObj);
        if (domain) extractedData['domain'] = domain;
        if (typeof atsScoreAfter === 'number' && atsScoreAfter > 0) extractedData['ats_score'] = atsScoreAfter;

        await this.userCvRepo.upsert(
          {
            userId,
            fileName: file.originalname,
            fileSize: file.buffer.length,
            fileMime: file.mimetype,
            extractedData,
            atsScore: typeof atsScoreAfter === 'number' ? atsScoreAfter : undefined,
            lastAnalyzedAt: new Date(),
          } as any,
          { conflictPaths: ['userId'] },
        );
        this.logger.log(`Updated PostgreSQL user_cvs for user ${userId} after CV save (${file.originalname}, ats: ${atsScoreBefore}→${atsScoreAfter})`);
      } catch (err) {
        this.logger.warn(`Failed to update PostgreSQL user_cvs for user ${userId}: ${(err as Error).message}`);
      }

      return {
        ats_score_before: atsScoreBefore,
        ats_score_after: atsScoreAfter,
        domain,
        parsed_cv: parsedCvStr,
      };
    } catch (err) {
      this.handleAxiosError(err, 'CV Booster error');
    }
  }

  /** Sanitize CV extraction data — only keep safe structured fields */
  private sanitizeCvExtractedData(raw: Record<string, unknown>): Record<string, unknown> {
    const safeKeys = [
      'role', 'seniority', 'years_exp', 'domain', 'industry', 'education',
      'skills', 'summary', 'bullets', 'languages', 'first_name', 'last_name',
      'email', 'linkedin', 'ats_score', 'ats_feedback',
    ];
    const safe: Record<string, unknown> = {};
    for (const key of safeKeys) {
      if (raw[key] !== undefined) safe[key] = raw[key];
    }
    return safe;
  }

  async proxyCvStoreUser(userId: number, userIdStr: string): Promise<Record<string, unknown>> {
    await this.consumeAgent(userId, AGENT_KEYS.CV);
    const base = this.getCvUrl();
    if (!base) throw new HttpException('CV Booster agent not configured', 503);
    const url = `${base}/store-user`;

    try {
      const res = await this.agentHttp.post(url, { user_id: userIdStr }, {
        responseType: 'json',
      });
      return res.data as Record<string, unknown>;
    } catch (err) {
      this.handleAxiosError(err, 'CV Store User error');
    }
  }

  async proxyCvStoreUserPublic(userIdStr: string): Promise<Record<string, unknown>> {
    // Public method - no agent consumption required
    const base = this.getCvUrl();
    if (!base) throw new HttpException('CV Booster agent not configured', 503);
    const url = `${base}/store-user`;

    try {
      const formData = new FormData();
      formData.append('user_id', userIdStr);

      const res = await this.agentHttp.post(url, formData, {
        headers: formData.getHeaders(),
        responseType: 'json',
      });
      return res.data as Record<string, unknown>;
    } catch (err) {
      // Best effort endpoint from landing page: don't break UX when CV agent is down.
      if (err instanceof AxiosError && !err.response) {
        this.logger.warn(`CV Store User Public unavailable (best effort skipped): ${err.message}`);
        return { status: 'skipped', user_id: userIdStr, reason: 'cv_agent_unavailable' };
      }
      this.handleAxiosError(err, 'CV Store User Public error');
    }
  }

  // ── Job Search Agent ───────────────────────────────────────────────────────



  async proxyJobSearchGet(userId: number, path: string, query?: Record<string, string>): Promise<unknown> {

    const base = this.getJobSearchUrl();

    if (!base) throw new HttpException('Job Search agent not configured', 503);

    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

    // Python agent lists jobs via GET /api/matches/{user_id} (user in path, not ?user_id=)
    const params =
      path.includes('/api/matches/') ? { ...query } : { ...query, user_id: String(userId) };

    try {

      const res = await this.agentHttp.get(url, { params, headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      this.handleAxiosError(err, 'Job Search agent error');

    }

  }

  /** Build a text summary of a user's CV extracted data for job matching */
  private buildCvTextFromExtracted(extracted: Record<string, unknown>): string {
    const parts: string[] = [];
    const s = (key: string) => {
      const v = extracted[key];
      return typeof v === 'string' ? v.trim() : '';
    };
    const name = [s('first_name'), s('last_name')].filter(Boolean).join(' ');
    if (name) parts.push(`Name: ${name}`);
    if (s('role')) parts.push(`Role: ${s('role')}`);
    if (s('seniority')) parts.push(`Seniority: ${s('seniority')}`);
    if (s('years_exp')) parts.push(`Experience: ${s('years_exp')}`);
    if (s('domain')) parts.push(`Domain: ${s('domain')}`);
    if (s('industry')) parts.push(`Industry: ${s('industry')}`);
    if (s('education')) parts.push(`Education: ${s('education')}`);
    const skills = extracted['skills'];
    if (typeof skills === 'string' && skills) {
      parts.push(`Skills: ${skills}`);
    } else if (Array.isArray(skills)) {
      parts.push(`Skills: ${skills.join(', ')}`);
    }
    if (s('summary')) parts.push(`Summary: ${s('summary')}`);
    if (s('languages')) parts.push(`Languages: ${s('languages')}`);
    return parts.join('\n');
  }

  /** POST /scan on Job Search agent — body must match FastAPI ScanRequest. */
  async proxyJobSearchScanStream(
    userId: number,
    cv_raw_text = '',
    opts: { bypass_cache?: boolean; role_filter?: string; location_filter?: string } = {},
  ): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.JOB_SEARCH);
    const base = this.getJobSearchUrl();
    if (!base) throw new HttpException('Job Search agent not configured', 503);
    const url = `${base}/scan`;

    // Always load fresh CV text from DB to ensure current CV is used
    let effectiveCvText = typeof cv_raw_text === 'string' ? cv_raw_text : '';
    let cvUpdatedAt: string | undefined;
    let cvExtractedData: Record<string, unknown> | undefined;
    try {
      const cv = await this.userCvRepo.findOne({ where: { userId } });
      if (cv) {
        if (cv.extractedData && Object.keys(cv.extractedData).length > 0) {
          effectiveCvText = this.buildCvTextFromExtracted(cv.extractedData);
          cvExtractedData = cv.extractedData;
          this.logger.log(`Loaded CV data for user ${userId} (${effectiveCvText.length} chars) for scan`);
        }
        if (cv.updatedAt) {
          cvUpdatedAt = cv.updatedAt.toISOString();
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load CV from DB for scan (user ${userId}): ${(err as Error).message}`);
    }

    const body = {
      user_id: userId,
      cv_raw_text: effectiveCvText,
      cv_extracted_data: cvExtractedData || {},
      cv_updated_at: cvUpdatedAt || null,
      bypass_cache: opts.bypass_cache ?? false,
      role_filter: opts.role_filter ?? '',
      location_filter: opts.location_filter ?? '',
    };
    this.logger.log(`Scan for user ${userId}: bypass_cache=${body.bypass_cache}, cv_text_length=${effectiveCvText.length}, has_extracted_data=${!!cvExtractedData}`);
    try {
      const res = await this.agentHttp.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
      });
      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;
    } catch (err) {
      this.handleAxiosError(err, 'Job Search scan error');
    }
  }



  async proxyJobSearchPost(userId: number, path: string, body: Record<string, unknown> = {}): Promise<unknown> {
    await this.consumeAgent(userId, AGENT_KEYS.JOB_SEARCH);
    const base = this.getJobSearchUrl();

    if (!base) throw new HttpException('Job Search agent not configured', 503);

    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      this.handleAxiosError(err, 'Job Search agent error');

    }

  }

  /** Sync learner CV/profile to Job Search Cosmos (no agent credit). */
  async proxyJobSearchSyncProfile(
    userId: number,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const base = this.getJobSearchUrl();
    if (!base) throw new HttpException('Job Search agent not configured', 503);
    const url = `${base}/api/user/${userId}/sync-profile`;
    try {
      const res = await this.agentHttp.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      return res.data;
    } catch (err) {
      this.handleAxiosError(err, 'Job Search sync-profile error');
    }
  }

  async proxyJobSearchPostBuffer(userId: number, path: string, body: Record<string, unknown> = {}): Promise<Buffer> {

    const base = this.getJobSearchUrl();

    if (!base) throw new HttpException('Job Search agent not configured', 503);

    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, {

        headers: { 'Content-Type': 'application/json' },

        responseType: 'arraybuffer',

      });

      return Buffer.from(res.data as ArrayBuffer);

    } catch (err) {

      this.handleAxiosError(err, 'Job Search agent error');

    }

  }



  async proxyJobSearchGetStream(userId: number, path: string): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.JOB_SEARCH);
    const base = this.getJobSearchUrl();

    if (!base) throw new HttpException('Job Search agent not configured', 503);

    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

    try {

      const res = await this.agentHttp.get(url, { params: { user_id: String(userId) }, responseType: 'stream' });

      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;

    } catch (err) {

      this.handleAxiosError(err, 'Job Search agent error');

    }

  }



  async proxyJobSearchPostStream(userId: number, path: string, body: Record<string, unknown> = {}): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.JOB_SEARCH);
    const base = this.getJobSearchUrl();

    if (!base) throw new HttpException('Job Search agent not configured', 503);

    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, {

        headers: { 'Content-Type': 'application/json' },

        responseType: 'stream',

      });

      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;

    } catch (err) {

      this.handleAxiosError(err, 'Job Search agent error');

    }

  }



  // ── Cloud Tutor (03_Agents) ────────────────────────────────────────────────



  private cloudTutorFallbackStream(body: Record<string, unknown>): ReadableStream<Uint8Array> {
    const lang = String(body.lang || body.locale || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    const message =
      lang === 'en'
        ? "Cloud Tutor is temporarily running in safe mode. I can keep the lesson open, but the AI tutor service is not connected yet. Please try again in a moment."
        : "Cloud Tutor fonctionne temporairement en mode secours. Je garde le cours ouvert, mais le service IA du tuteur n'est pas encore connecte. Reessayez dans un instant.";
    const payload = `${JSON.stringify({ agent_used: 'CloudTutor fallback', chunk: message, lang })}\n`;
    return Readable.toWeb(Readable.from([payload])) as ReadableStream<Uint8Array>;
  }

  private cloudTutorFallbackResponse(body: Record<string, unknown>): Record<string, unknown> {
    const lang = String(body.lang || body.locale || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    return {
      agent_used: 'CloudTutor fallback',
      lang,
      response:
        lang === 'en'
          ? 'Cloud Tutor is temporarily unavailable. The request was accepted in safe mode.'
          : 'Cloud Tutor est temporairement indisponible. La requete a ete acceptee en mode secours.',
    };
  }

  async proxyCloudTutorChat(userId: number, body: Record<string, unknown>): Promise<unknown> {

    const base = this.getCloudTutorUrl();

    if (!base) throw new HttpException('Cloud Tutor agent not configured', 503);

    const url = `${base}/api/chat`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cloud Tutor agent unavailable, using fallback response: ${message}`);
      return this.cloudTutorFallbackResponse(enriched);

    }

  }



  async proxyCloudTutorChatStream(userId: number, body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.CLOUD_TUTOR);
    const base = this.getCloudTutorUrl();

    if (!base) throw new HttpException('Cloud Tutor agent not configured', 503);

    const url = `${base}/api/chat`;

    const enriched = this.enrichBody(body, userId);
    this.logger.log(
      `[cloud-tutor] user=${userId} session=${enriched.session_id} course_id=${enriched.course_id ?? '-'} lesson_id=${enriched.lesson_id ?? '-'} is_audio=${enriched.is_audio ?? false}`,
    );

    try {

      const res = await this.agentHttp.post(url, enriched, {

        headers: { 'Content-Type': 'application/json' },

        responseType: 'stream',

      });

      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;

    } catch (err) {

      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cloud Tutor agent unavailable, using fallback stream: ${message}`);
      return this.cloudTutorFallbackStream(enriched);

    }

  }



  async proxyCloudTutorQuota(userId: number): Promise<{ remaining_credits: number; max_credits: number }> {
    const base = this.getCloudTutorUrl();
    if (!base) throw new HttpException('Cloud Tutor agent not configured', 503);
    const url = `${base}/api/quota/${userId}`;
    try {
      const res = await this.agentHttp.get<{ remaining_credits: number; max_credits: number }>(url);
      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cloud Tutor quota unavailable, using fallback quota: ${message}`);
      return { remaining_credits: 999, max_credits: 999 };
    }
  }

  async proxyCloudTutorSessionEnd(userId: number, body: { session_id?: string }): Promise<unknown> {
    const base = this.getCloudTutorUrl();
    if (!base) throw new HttpException('Cloud Tutor agent not configured', 503);
    const url = `${base}/api/session/end`;
    try {
      const res = await this.agentHttp.post(url, {
        user_id: String(userId),
        session_id: body.session_id || 'unknown',
      }, { headers: { 'Content-Type': 'application/json' } });
      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cloud Tutor session end unavailable, acknowledging locally: ${message}`);
      return {
        ok: true,
        fallback: true,
        user_id: String(userId),
        session_id: body.session_id || 'unknown',
      };
    }
  }

  // ── Coach Agent ─────────────────────────────────────────────────────────────



  async proxyCoachChat(userId: number, body: Record<string, unknown>): Promise<unknown> {

    const base = this.getCoachUrl();

    if (!base) throw new HttpException('Coach agent not configured', 503);

    const url = `${base}/api/chat`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, { headers: { 'Content-Type': 'application/json' } });

      return res.data;

    } catch (err) {

      this.handleAxiosError(err, 'Coach agent error');

    }

  }



  async proxyCoachChatStream(userId: number, body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    await this.consumeAgent(userId, AGENT_KEYS.COACH);
    const base = this.getCoachUrl();

    if (!base) throw new HttpException('Coach agent not configured', 503);

    const url = `${base}/api/chat`;

    const enriched = this.enrichBody(body, userId);

    try {

      const res = await this.agentHttp.post(url, enriched, {

        headers: { 'Content-Type': 'application/json' },

        responseType: 'stream',

      });

      return Readable.toWeb(res.data as Readable) as ReadableStream<Uint8Array>;

    } catch (err) {

      this.handleAxiosError(err, 'Coach agent error');

    }

  }



  /** Collect Cloud Tutor stream into a single explanation string (for Quiz agent orchestration). */

  async getCloudTutorExplanation(userId: number, message: string, sessionId?: string, lang?: string): Promise<string> {

    const stream = await this.proxyCloudTutorChatStream(userId, {

      message,

      session_id: sessionId,

      lang: lang || 'fr',

      is_audio: false,

    });

    const reader = stream.getReader();

    const decoder = new TextDecoder('utf-8');

    let full = '';

    try {

      while (true) {

        const { done, value } = await reader.read();

        if (done) break;

        const line = decoder.decode(value, { stream: true });

        for (const part of line.split('\n')) {

          if (!part.trim()) continue;

          try {

            const data = JSON.parse(part) as { chunk?: string; status?: string };

            if (data.status === 'streaming' && data.chunk) full += data.chunk;

          } catch {

            // skip

          }

        }

      }

    } finally {

      reader.releaseLock();

    }

    return full.trim() || 'Explication non disponible.';

  }

  /**
   * Published jobs for CV / job-search flows. Uses CV-detected domain when provided (from agent),
   * then quiz domain, then broad DB match, then recent published offers so the UI is never empty in dev.
   */
  async getInternalJobsForUser(
    userId: number,
    opts?: { cvDomain?: string; skills?: string[] },
  ): Promise<any[]> {
    const mapJobs = (jobs: Job[]) => jobs.map((j) => this.convertInternalJobToAgentFormat(j));

    let quizDomain: string | undefined;
    try {
      const platformData = await this.getCvPlatformData(userId);
      quizDomain = platformData?.quiz?.domain?.trim() || undefined;
    } catch {
      // Platform-data is optional for listing jobs
    }

    const cvDomain = opts?.cvDomain?.trim();
    const skills = opts?.skills?.filter(Boolean) ?? [];
    const primaryDomain = cvDomain || quizDomain;

    try {
      let internalJobs = await this.jobsService.findByMatchingCriteria(primaryDomain, []);
      if (internalJobs.length === 0 && primaryDomain) {
        internalJobs = await this.jobsService.findByMatchingCriteria(undefined, []);
      }
      if (internalJobs.length === 0 && skills.length > 0) {
        internalJobs = await this.jobsService.findByMatchingCriteria(undefined, skills);
      }
      if (internalJobs.length === 0) {
        internalJobs = (await this.jobsService.findByMatchingCriteria(undefined, [])).slice(0, 15);
      }
      return mapJobs(internalJobs);
    } catch (err) {
      this.logger.error('Error fetching internal jobs for user:', err);
      try {
        const fallback = (await this.jobsService.findByMatchingCriteria(undefined, [])).slice(0, 12);
        return mapJobs(fallback);
      } catch {
        return [];
      }
    }
  }

  private convertInternalJobToAgentFormat(job: any) {
    return {
      id: job.id,
      url: `/dashboard/learner/emploi/${job.id}`,
      title: job.title,
      company: job.company?.name || 'Subul Partner',
      location: job.location || 'Remote',
      posted: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Just now',
      match_score: '95%', // Placeholder for platform jobs
      cosine: 0.95,
      remote: job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site',
      salary: job.salary ? `${job.salary}` : undefined,
      industry: job.domain || 'Tech',
      description: job.description,
      source: 'Subul internal',
      gap_matched: job.skills || [],
      job_origin: 'local' as const,
      xai: {
        match_reasons: ['Opportunity from Subul internal partners', 'Matches your verified domain'],
      }
    };
  }

  /** Job Search GET /api/matches shape → same card shape as local platform jobs. */
  private normalizeJobSearchMatch(raw: Record<string, unknown>): Record<string, unknown> {
    const scoreRaw = raw.match_score ?? raw.total ?? 0;
    const num = typeof scoreRaw === 'number' ? scoreRaw : parseFloat(String(scoreRaw));
    const pct =
      Number.isFinite(num) && num > 0 && num <= 1 ? Math.round(num * 100) : Math.round(Number.isFinite(num) ? num : 0);
    const matched = Array.isArray(raw.matched) ? raw.matched : [];
    const gap = Array.isArray(raw.gap_missing) ? raw.gap_missing : [];
    const url = String(raw.url || '').trim();
    const title = String(raw.title || '').trim();
    const company = String(raw.company || '').trim();
    const gapMatched = [...matched.map(String), ...gap.map(String)].filter(Boolean).slice(0, 12);
    const cosRaw = raw.cosine;
    const cosNum = typeof cosRaw === 'number' ? cosRaw : parseFloat(String(cosRaw ?? 0));
    return {
      id: url || `js-${title}-${company}`.slice(0, 120),
      url: url || '#',
      title: title || 'Role',
      company: company || 'Company',
      location: String(raw.location || 'Remote'),
      posted: String(raw.date_posted || ''),
      match_score: `${Math.min(100, Math.max(0, pct))}%`,
      cosine: cosNum > 1 ? cosNum / 100 : cosNum,
      remote: String(raw.remote || ''),
      salary: raw.salary != null ? String(raw.salary) : undefined,
      industry: String(raw.source || 'job-search'),
      description: String(raw.description || '').slice(0, 4000),
      source: String(raw.source || 'job-search-agent'),
      gap_matched: gapMatched,
      job_origin: 'job_search_agent' as const,
      xai: raw.verdict
        ? { match_reasons: [String(raw.verdict)] }
        : { match_reasons: ['Matched via Job Search agent'] },
    };
  }

  async getJobSearchStartupJobs(
    userId: number,
    topN = 20,
  ): Promise<{ merged: any[]; bySource: { local: any[]; job_search_agent: any[]; cv_boost: any[] } }> {
    const safeTopN = Number.isFinite(topN) && topN > 0 ? Math.min(100, Math.floor(topN)) : 20;
    const base = this.getJobSearchUrl();
    if (!base) {
      return { merged: [], bySource: { local: [], job_search_agent: [], cv_boost: [] } };
    }

    const data = (await this.proxyJobSearchPost(userId, `/api/matches?top_n=${safeTopN}`, {})) as {
      matches?: Record<string, unknown>[];
    };
    const jobSearchAgent = Array.isArray(data?.matches) ? data.matches.map((m) => this.normalizeJobSearchMatch(m)) : [];
    return {
      merged: jobSearchAgent,
      bySource: { local: [], job_search_agent: jobSearchAgent, cv_boost: [] },
    };
  }

  private jobDedupeKey(job: Record<string, unknown>): string {
    const u = String(job.url || '')
      .trim()
      .toLowerCase();
    if (u && u !== '#' && u.startsWith('http')) return `url:${u}`;
    const t = this.normalizeJobKeyPart(String(job.title || ''));
    const c = this.normalizeJobKeyPart(String(job.company || ''));
    return `tc:${t}|${c}`;
  }

  private normalizeJobKeyPart(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private parseMatchScorePercent(job: Record<string, unknown>): number {
    const ms = job.match_score;
    if (typeof ms === 'number') return Math.min(100, Math.max(0, ms));
    const s = String(ms ?? '');
    const n = parseFloat(s.replace(/%/g, ''));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  }

  private extractCvTokensFromParsedCv(parsedCv?: Record<string, unknown>): Set<string> {
    const tokens = new Set<string>();
    if (!parsedCv || typeof parsedCv !== 'object') return tokens;
    const pushText = (t: string) => {
      for (const w of t.toLowerCase().split(/[^a-z0-9+#.]+/)) {
        if (w.length > 2) tokens.add(w);
      }
    };
    const jt = parsedCv.job_title;
    if (typeof jt === 'string') pushText(jt);
    const sections = parsedCv.sections;
    if (sections && typeof sections === 'object') {
      for (const v of Object.values(sections)) {
        if (Array.isArray(v)) {
          for (const line of v) {
            if (typeof line === 'string') pushText(line);
          }
        }
      }
    }
    const skills = parsedCv.skills ?? (parsedCv as { technical_skills?: unknown }).technical_skills;
    if (Array.isArray(skills)) {
      for (const s of skills) {
        if (typeof s === 'string') pushText(s);
      }
    } else if (typeof skills === 'string') {
      for (const part of skills.split(/[,;]/)) pushText(part.trim());
    }
    return tokens;
  }

  private scoreJobTextAgainstCvTokens(job: Record<string, unknown>, cvTokens: Set<string>): number {
    if (cvTokens.size === 0) return 0;
    const gap = Array.isArray(job.gap_matched) ? job.gap_matched : [];
    const blob = [job.title, job.description, job.company, ...gap.map(String)]
      .map((v) => String(v || ''))
      .join(' ')
      .toLowerCase();
    let hit = 0;
    for (const t of cvTokens) {
      if (blob.includes(t)) hit += 1;
    }
    return hit / cvTokens.size;
  }

  /**
   * Three-source aggregation for CV boost: Postgres published jobs, Job Search GET matches,
   * and a CV-aligned shortlist (token overlap on parsed_cv). Sources are isolated with Promise.allSettled-style try/catch.
   */
  async aggregatePlatformJobsForCvBoost(
    userId: number,
    opts?: { cvDomain?: string; skills?: string[]; parsedCv?: Record<string, unknown> },
  ): Promise<{
    merged: any[];
    bySource: { local: any[]; job_search_agent: any[]; cv_boost: any[] };
  }> {
    let local: any[] = [];
    try {
      local = await this.getInternalJobsForUser(userId, {
        cvDomain: opts?.cvDomain,
        skills: opts?.skills,
      });
    } catch (e) {
      this.logger.warn(`Local jobs fetch failed: ${String((e as Error)?.message)}`);
    }

    let jobSearchAgent: any[] = [];
    try {
      const base = this.getJobSearchUrl();
      if (base) {
        const data = (await this.proxyJobSearchGet(userId, `/api/matches/${userId}`)) as {
          matches?: Record<string, unknown>[];
        };
        if (Array.isArray(data?.matches)) {
          jobSearchAgent = data.matches.map((m) => this.normalizeJobSearchMatch(m));
        }
      }
    } catch (e) {
      this.logger.warn(`Job Search GET /api/matches failed: ${String((e as Error)?.message)}`);
    }

    const dedup = new Map<string, any>();
    for (const j of local) {
      const k = this.jobDedupeKey(j as Record<string, unknown>);
      if (!dedup.has(k)) dedup.set(k, j);
    }
    for (const j of jobSearchAgent) {
      const k = this.jobDedupeKey(j as Record<string, unknown>);
      if (!dedup.has(k)) dedup.set(k, j);
    }

    const merged = [...dedup.values()].sort(
      (a, b) => this.parseMatchScorePercent(b as Record<string, unknown>) - this.parseMatchScorePercent(a as Record<string, unknown>),
    );

    const cvTokens = this.extractCvTokensFromParsedCv(opts?.parsedCv);
    let cv_boost: any[] = [];
    if (cvTokens.size > 0) {
      cv_boost = merged
        .map((j) => ({
          j,
          s: this.scoreJobTextAgainstCvTokens(j as Record<string, unknown>, cvTokens),
        }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 12)
        .map(({ j, s }) => ({
          ...j,
          job_origin: 'cv_boost',
          cv_overlap_score: Math.round(s * 1000) / 1000,
        }));
    }

    return {
      merged,
      bySource: {
        local,
        job_search_agent: jobSearchAgent,
        cv_boost,
      },
    };
  }

  /**
   * Single job for learner emploi offer detail: merged aggregation first, then platform UUID lookup.
   */
  async resolveLearnerEmploiJobById(userId: number, rawJobId: string): Promise<Record<string, unknown>> {
    let jobId = (rawJobId || '').trim();
    try {
      jobId = decodeURIComponent(jobId);
    } catch {
      /* keep raw */
    }
    const { merged } = await this.aggregatePlatformJobsForCvBoost(userId, {});
    const fromMerged = merged.find((j) => this.jobRecordMatchesId(j as Record<string, unknown>, jobId));
    if (fromMerged) {
      return this.normalizeLearnerEmploiJobDetail(fromMerged as Record<string, unknown>);
    }
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(jobId)) {
      try {
        const job = await this.jobsService.findOne(jobId);
        return this.normalizeLearnerEmploiJobDetail(this.convertInternalJobToAgentFormat(job) as Record<string, unknown>);
      } catch {
        /* fall through */
      }
    }
    throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
  }

  private jobRecordMatchesId(job: Record<string, unknown>, needle: string): boolean {
    const id = String(job.id ?? '').trim();
    if (id && id === needle) return true;
    const url = String(job.url ?? '').trim();
    if (!url) return false;
    if (url === needle) return true;
    try {
      if (decodeURIComponent(url) === needle) return true;
    } catch {
      /* ignore */
    }
    if (needle.length > 8 && url.includes(needle)) return true;
    return false;
  }

  private normalizeLearnerEmploiJobDetail(job: Record<string, unknown>): Record<string, unknown> {
    const pct = this.parseMatchScorePercent(job);
    const cosRaw = job.cosine;
    const cosNum = typeof cosRaw === 'number' ? cosRaw : parseFloat(String(cosRaw ?? 0));
    const cosine = Number.isFinite(cosNum) ? (cosNum > 1 ? cosNum / 100 : cosNum) : 0;
    return {
      id: String(job.id ?? ''),
      title: String(job.title ?? ''),
      company: String(job.company ?? job.industry ?? ''),
      location: String(job.location ?? ''),
      description: String(job.description ?? ''),
      match_score: pct / 100,
      compatibility_pct: pct,
      cosine,
      similarity_pct: Math.round(Math.max(0, Math.min(1, cosine)) * 100),
      source: String(job.source ?? ''),
      posted: String(job.posted ?? ''),
      url: String(job.url ?? '#'),
      remote: job.remote,
      salary: job.salary != null ? String(job.salary) : undefined,
      job_origin: job.job_origin,
    };
  }
}
