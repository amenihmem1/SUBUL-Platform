import { Injectable, Logger } from '@nestjs/common';

/**
 * Generates embeddings via Azure OpenAI REST so we don't pull in the SDK
 * just for one endpoint. Uses the same deployment the Python tutor relies on
 * (`text-embedding-3-small-2`, 1536 dims) so vectors match the index schema.
 *
 * Rate-limit handling: on 429 the API returns a Retry-After header (seconds).
 * We honour it with up to MAX_RETRIES attempts and exponential backoff floor.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  private get config() {
    // TUTOR_* vars preferred; fall back to the shared AZURE_OPENAI_* vars
    // that are always present in the Kubernetes pod (set via ConfigMap/Secret).
    const endpoint =
      process.env.TUTOR_AZURE_OPENAI_ENDPOINT ||
      process.env.AZURE_OPENAI_CHAT_ENDPOINT ||
      process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey =
      process.env.TUTOR_AZURE_OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY;
    const deployment =
      process.env.TUTOR_AZURE_OPENAI_EMBEDDING_DEPLOYMENT ||
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ||
      'text-embedding-3-small-2';
    const apiVersion =
      process.env.TUTOR_AZURE_OPENAI_API_VERSION ||
      process.env.AZURE_OPENAI_API_VERSION ||
      '2024-12-01-preview';
    return { endpoint, apiKey, deployment, apiVersion };
  }

  isConfigured(): boolean {
    const { endpoint, apiKey, deployment } = this.config;
    return Boolean(endpoint && apiKey && deployment);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** Embed an array of texts and return vectors in the same order. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const { endpoint, apiKey, deployment, apiVersion } = this.config;
    if (!endpoint || !apiKey) {
      throw new Error(
        'Azure OpenAI not configured. Set TUTOR_AZURE_OPENAI_ENDPOINT + TUTOR_AZURE_OPENAI_API_KEY, or AZURE_OPENAI_CHAT_ENDPOINT + AZURE_OPENAI_API_KEY.',
      );
    }
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;
    const out: number[][] = [];

    const BATCH = 16;
    const MAX_RETRIES = 6;

    for (let i = 0; i < texts.length; i += BATCH) {
      const slice = texts.slice(i, i + BATCH);
      let attempt = 0;

      while (true) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
          body: JSON.stringify({ input: slice }),
        });

        if (res.status === 429) {
          if (attempt >= MAX_RETRIES) {
            const body = await res.text();
            throw new Error(`Embeddings request failed (429) after ${MAX_RETRIES} retries: ${body}`);
          }
          // Honour Retry-After header; fall back to exponential backoff (2s, 4s, 8s…)
          const retryAfterHeader = res.headers.get('Retry-After');
          const retryAfterMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : Math.min(2 ** attempt * 2000, 60_000);
          this.logger.warn(
            `[embedBatch] 429 rate limit hit — waiting ${retryAfterMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await this.sleep(retryAfterMs);
          attempt++;
          continue;
        }

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Embeddings request failed (${res.status}): ${body}`);
        }

        const json = (await res.json()) as {
          data?: Array<{ embedding: number[]; index: number }>;
        };
        const data = json.data ?? [];
        data.sort((a, b) => a.index - b.index);
        for (const d of data) out.push(d.embedding);
        break;
      }
    }
    return out;
  }

  async embed(text: string): Promise<number[]> {
    const [v] = await this.embedBatch([text]);
    return v ?? [];
  }
}
