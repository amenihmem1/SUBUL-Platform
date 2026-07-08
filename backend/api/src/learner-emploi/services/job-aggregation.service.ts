import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { JobCard, SourceAggregationResult } from '../learner-emploi.types';
import { AnalyzeRequestDto } from '../dto/analyze-request.dto';
import { AgentsService } from '../../agents/agents.service';

interface SourceAdapter {
  source: string;
  fetchJobs(query: string, options: AnalyzeRequestDto): Promise<JobCard[]>;
}

@Injectable()
export class JobAggregationService {
  private readonly logger = new Logger(JobAggregationService.name);
  private readonly adapters: SourceAdapter[];

  constructor(private readonly agentsService: AgentsService) {
    this.adapters = [
      new RemoteOkAdapter(),
      new RemotiveAdapter(),
      new ArbeitnowAdapter(),
      new GreenhouseAdapter(),
      new LeverAdapter(),
      new KeepJobAdapter(),
    ];
  }

  async aggregate(roleHint: string, options: AnalyzeRequestDto, userId?: number): Promise<SourceAggregationResult> {
    const query = toSearchQuery(options.target_role || roleHint || 'software engineer');
    const timings: Record<string, number> = {};
    const warnings: string[] = [];
    const partialFailures: string[] = [];
    const qualityFlags: string[] = [];
    const sourcesUsed: string[] = [];

    const settled = await Promise.allSettled(
      this.adapters.map(async (adapter) => {
        const start = Date.now();
        try {
          const jobs = await adapter.fetchJobs(query, options);
          timings[adapter.source] = Date.now() - start;
          if (jobs.length > 0) {
            sourcesUsed.push(adapter.source);
          }
          return { source: adapter.source, jobs };
        } catch (error) {
          timings[adapter.source] = Date.now() - start;
          warnings.push(`${adapter.source}: ${(error as Error).message}`);
          partialFailures.push(adapter.source);
          this.logger.warn(`[${adapter.source}] ${String((error as Error).message)}`);
          return { source: adapter.source, jobs: [] as JobCard[] };
        }
      }),
    );

    const agentJobsStart = Date.now();
    let agentJobs: JobCard[] = [];
    if (userId) {
      try {
        agentJobs = await this.fetchFromExistingJobSearchAgent(userId, query, options);
        
        if (agentJobs.length > 0) {
          
        }
      } catch (error) {
     
        warnings.push(`job-search-agent: ${(error as Error).message}`);
        partialFailures.push('job-search-agent');
      }
    }

    const allJobs = settled
      .filter((r): r is PromiseFulfilledResult<{ source: string; jobs: JobCard[] }> => r.status === 'fulfilled')
      .flatMap((r) => r.value.jobs)
      .concat(agentJobs);

    const filtered = this.applyFilters(allJobs, options);
    const deduped = this.dedupe(filtered);
    if (deduped.length < Math.max(3, Math.floor(allJobs.length * 0.2))) {
      qualityFlags.push('low_job_volume_after_filters');
    }
    if (partialFailures.length > 0) {
      qualityFlags.push('partial_source_failure');
    }
    if (deduped.length === 0) {
      warnings.push(`No jobs matched for query "${query}"`);
      qualityFlags.push('no_jobs_matched');
    }

    return {
      jobs: deduped,
      warnings,
      sourceTimingsMs: timings,
      sourcesUsed,
      totalScraped: allJobs.length,
      partialFailures,
      qualityFlags,
    };
  }

  private applyFilters(jobs: JobCard[], options: AnalyzeRequestDto): JobCard[] {
    let out = jobs;
    if (options.remote_only) {
      out = out.filter((j) => j.remote);
    }

    if (options.locations && options.locations.length > 0) {
      const locations = options.locations.map((l) => l.toLowerCase());
      out = out.filter((job) => {
        const loc = job.location.toLowerCase();
        return locations.some((wanted) => loc.includes(wanted));
      });
    }

    const maxJobs = options.max_jobs ?? 50;
    return out.slice(0, maxJobs);
  }

  private dedupe(jobs: JobCard[]): JobCard[] {
    const map = new Map<string, JobCard>();
    for (const job of jobs) {
      const key = `${normalize(job.title)}|${normalize(job.company)}|${normalize(job.location)}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, job);
        continue;
      }
      const existingQuality = existing.description.length + existing.tags.length * 8;
      const newQuality = job.description.length + job.tags.length * 8;
      if (newQuality > existingQuality) {
        map.set(key, job);
      }
    }
    return [...map.values()];
  }

  private async fetchFromExistingJobSearchAgent(
    userId: number,
    query: string,
    options: AnalyzeRequestDto,
  ): Promise<JobCard[]> {
    const jobs: JobCard[] = [];

    // 1) Include internal platform matches already exposed by the existing agent service.
    const internal = await this.agentsService.getInternalJobsForUser(userId);
    jobs.push(...internal.map((item) => this.mapAgentJob(item, 'job-search-agent-internal')));

    // 2) Trigger existing Job Search scan stream and parse job events.
    const stream = await this.agentsService.proxyJobSearchPostStream(userId, '/scan', {
      query,
      target_role: query,
      remote_only: Boolean(options.remote_only),
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const parsed = this.parseStreamChunk(chunk);
          if (!parsed) continue;
          jobs.push(this.mapAgentJob(parsed, 'job-search-agent'));
        }
      }
    } finally {
      reader.releaseLock();
    }

    return jobs.filter((job) => Boolean(job.url && job.title));
  }

  private parseStreamChunk(chunk: string): Record<string, unknown> | null {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload) as Record<string, unknown>;
        if (obj.title || obj.job || obj.url) return obj;
      } catch {
        // ignore partial/chatter frames
      }
    }
    return null;
  }

  private mapAgentJob(item: Record<string, unknown>, source: string): JobCard {
    const title = asString(item.title || item.job || '');
    const company = asString(item.company || item.organization || 'Unknown');
    const location = asString(item.location || item.remote || 'Remote');
    const description = asString(item.description || item.summary || '');
    const remoteRaw = asString(item.remote || location);
    const remote = /remote/i.test(remoteRaw) || /remote/i.test(location);
    const url = asString(item.url || item.link || '');
    const tags = Array.isArray(item.gap_matched)
      ? (item.gap_matched as unknown[]).map((v) => asString(v)).filter(Boolean)
      : extractTags(description);
    return jobFrom({
      source,
      title,
      company,
      location,
      remote,
      url,
      postedAt: asString(item.posted || item.posted_at || ''),
      salary: asString(item.salary || ''),
      description,
      tags,
    });
  }
}

class RemoteOkAdapter implements SourceAdapter {
  source = 'remoteok';

  async fetchJobs(query: string): Promise<JobCard[]> {
    const { data } = await axios.get<Array<Record<string, unknown>>>('https://remoteok.com/api', {
      timeout: 12000,
      headers: { Accept: 'application/json' },
    });
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => matchesQuery(`${asString(item.position)} ${asString(item.description)}`, query))
      .map((item) => {
        const title = asString(item.position);
        const company = asString(item.company || 'RemoteOK');
        const url = asString(item.url || item.apply_url || '');
        const tags = asArray(item.tags);
        const description = asString(item.description || '');
        return jobFrom({
          source: this.source,
          title,
          company,
          location: 'Remote',
          remote: true,
          url,
          postedAt: asString(item.date || ''),
          salary: asString(item.salary_min || ''),
          description,
          tags,
        });
      })
      .filter((j) => Boolean(j.url));
  }
}

class RemotiveAdapter implements SourceAdapter {
  source = 'remotive';

  async fetchJobs(query: string): Promise<JobCard[]> {
    const { data } = await axios.get<{ jobs?: Array<Record<string, unknown>> }>(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`,
      { timeout: 12000 },
    );
    const rows = data?.jobs || [];
    return rows.map((item) => {
      const title = asString(item.title);
      const company = asString(item.company_name || 'Remotive');
      const url = asString(item.url || '');
      const location = asString(item.candidate_required_location || 'Remote');
      const description = asString(item.description || '');
      const tags = asArray(item.tags);
      return jobFrom({
        source: this.source,
        title,
        company,
        location,
        remote: true,
        url,
        postedAt: asString(item.publication_date || ''),
        salary: asString(item.salary || ''),
        description,
        tags,
      });
    }).filter((j) => Boolean(j.url));
  }
}

class ArbeitnowAdapter implements SourceAdapter {
  source = 'arbeitnow';

  async fetchJobs(query: string): Promise<JobCard[]> {
    const { data } = await axios.get<{ data?: Array<Record<string, unknown>> }>(
      'https://www.arbeitnow.com/api/job-board-api',
      { timeout: 12000 },
    );
    const rows = data?.data || [];
    return rows
      .filter((item) => {
        const text = `${asString(item.title)} ${asString(item.description)}`;
        return matchesQuery(text, query);
      })
      .map((item) => {
        const location = asString(item.location || '');
        const description = asString(item.description || '');
        const remote = String(item.remote || '').toLowerCase() === 'true' || /remote/i.test(location);
        return jobFrom({
          source: this.source,
          title: asString(item.title),
          company: asString(item.company_name || 'Arbeitnow'),
          location: location || (remote ? 'Remote' : 'Unknown'),
          remote,
          url: asString(item.url || ''),
          postedAt: asString(item.created_at || ''),
          salary: '',
          description,
          tags: asArray(item.tags).length ? asArray(item.tags) : extractTags(description),
        });
      })
      .filter((j) => Boolean(j.url));
  }
}

class GreenhouseAdapter implements SourceAdapter {
  source = 'greenhouse';

  async fetchJobs(query: string): Promise<JobCard[]> {
    const tokens = (process.env.GREENHOUSE_BOARD_TOKENS || '').split(',').map((v) => v.trim()).filter(Boolean);
    if (tokens.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const { data } = await axios.get<{ jobs?: Array<Record<string, unknown>> }>(
          `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
          { timeout: 12000 },
        );
        return data?.jobs || [];
      }),
    );

    return results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter((job) => matchesQuery(`${asString(job.title)} ${asString(job.content)}`, query))
      .map((job) => {
        const content = asString(job.content || '');
        const cleanedDescription = cheerio.load(`<div>${content}</div>`).text().replace(/\s+/g, ' ').trim();
        return jobFrom({
          source: this.source,
          title: asString(job.title),
          company: asString(job.organization_name || 'Greenhouse Company'),
          location: asString((job.location as { name?: string } | undefined)?.name || ''),
          remote: /remote/i.test(asString((job.location as { name?: string } | undefined)?.name || '')),
          url: asString(job.absolute_url || ''),
          postedAt: asString(job.updated_at || ''),
          salary: '',
          description: cleanedDescription,
          tags: extractTags(cleanedDescription),
        });
      });
  }
}

class LeverAdapter implements SourceAdapter {
  source = 'lever';

  async fetchJobs(query: string): Promise<JobCard[]> {
    const companies = (process.env.LEVER_COMPANIES || 'netflix,shopify,discord')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (companies.length === 0) {
      return [];
    }

    const settled = await Promise.allSettled(
      companies.map(async (company) => {
        const { data } = await axios.get<Array<Record<string, unknown>>>(
          `https://api.lever.co/v0/postings/${company}?mode=json`,
          { timeout: 4000 },
        );
        return Array.isArray(data) ? data : [];
      }),
    );

    return settled
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter((item) => {
        const title = asString(item.text);
        const description = asString(item.descriptionPlain || item.description);
        return matchesQuery(`${title} ${description}`, query);
      })
      .map((item) => {
        const location = asString((item.categories as { location?: string } | undefined)?.location || '');
        const description = asString(item.descriptionPlain || item.description || '');
        return jobFrom({
          source: this.source,
          title: asString(item.text),
          company: asString((item.categories as { team?: string } | undefined)?.team || 'Lever Company'),
          location: location || 'Unknown',
          remote: /remote/i.test(location),
          url: asString(item.hostedUrl || ''),
          postedAt: asString(item.createdAt || ''),
          salary: '',
          description,
          tags: extractTags(description),
        });
      })
      .filter((j) => Boolean(j.url));
  }
}

class KeepJobAdapter implements SourceAdapter {
  source = 'keepjob';

  async fetchJobs(query: string): Promise<JobCard[]> {
    const feedUrl = process.env.KEEPJOB_FEED_URL;
    if (!feedUrl) return [];
    const { data } = await axios.get<Array<Record<string, unknown>>>(feedUrl, { timeout: 12000 });
    return (Array.isArray(data) ? data : [])
      .filter((item) => matchesQuery(`${asString(item.title)} ${asString(item.description)}`, query))
      .map((item) => {
        const description = asString(item.description || '');
        return jobFrom({
          source: this.source,
          title: asString(item.title),
          company: asString(item.company || 'KeepJob'),
          location: asString(item.location || ''),
          remote: Boolean(item.remote),
          url: asString(item.url || ''),
          postedAt: asString(item.posted_at || ''),
          salary: asString(item.salary || ''),
          description,
          tags: extractTags(description),
        });
      });
  }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function asArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter(Boolean);
}

const ROLE_KEYWORDS = new Set([
  'developer', 'developpeur', 'développeur', 'engineer', 'ingenieur', 'ingénieur',
  'fullstack', 'full-stack', 'backend', 'frontend', 'front-end', 'back-end',
  'software', 'data', 'devops', 'mobile', 'web3', 'sre', 'cloud',
  'cybersecurity', 'cybersecurite', 'cybersécurité', 'security', 'securite', 'sécurité',
  'analyst', 'analyste', 'architect', 'architecte', 'consultant',
  'administrator', 'administrateur', 'manager', 'lead', 'senior', 'junior',
  'machine', 'learning', 'ai', 'ml', 'nlp', 'deep',
  'javascript', 'typescript', 'python', 'java', 'node', 'react', 'angular', 'nestjs', 'vue',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'network', 'reseau', 'réseau', 'sysadmin', 'infrastructure',
  'pentester', 'pentest', 'soc', 'devsecops',
  'scientist', 'scientifique',
]);

const STOP_WORDS = new Set([
  'mr', 'mrs', 'dr', 'ben', 'bin', 'of', 'and', 'the', 'le', 'la', 'les', 'de', 'du', 'des', 'en', 'et', 'un', 'une',
]);

function toSearchQuery(raw: string): string {
  const source = raw.toLowerCase().replace(/[^\p{L}\p{N}\s+/.-]/gu, ' ');
  const parts = source
    .split(/\s+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => !/^\d+$/.test(v))
    .filter((v) => !STOP_WORDS.has(v));

  const roleWords = parts.filter((v) => ROLE_KEYWORDS.has(v));

  if (roleWords.length > 0) {
    return roleWords.slice(0, 4).join(' ');
  }
  if (parts.length > 0 && parts.length <= 3) {
    return parts.join(' ');
  }
  if (parts.length > 3) {
    return parts.slice(0, 3).join(' ');
  }
  return raw.trim() || 'software engineer';
}

function matchesQuery(text: string, query: string): boolean {
  const value = text.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length >= 3);
  if (tokens.length === 0) return true;
  const matched = tokens.filter((token) => value.includes(token)).length;
  const threshold = Math.max(1, Math.ceil(tokens.length / 2));
  return matched >= threshold;
}

function extractTags(text: string): string[] {
  const lexicon = [
    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'node', 'nestjs',
    'sql', 'postgresql', 'mongodb', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
    'tensorflow', 'pytorch', 'spark', 'airflow', 'tableau', 'power bi',
  ];
  const lower = text.toLowerCase();
  return lexicon.filter((skill) => lower.includes(skill));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function jobFrom(input: {
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  postedAt?: string;
  salary?: string;
  description: string;
  tags: string[];
}): JobCard {
  const id = createHash('sha1')
    .update(`${input.source}|${input.title}|${input.company}|${input.url}`)
    .digest('hex');
  return {
    id,
    source: input.source,
    title: input.title,
    company: input.company || 'Unknown',
    location: input.location || 'Unknown',
    remote: input.remote,
    url: input.url,
    postedAt: input.postedAt,
    salary: input.salary,
    description: input.description || '',
    tags: input.tags,
  };
}
