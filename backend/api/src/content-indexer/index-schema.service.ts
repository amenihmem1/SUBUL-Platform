import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Ensures the Azure Cognitive Search index has the fields we need.
 * Currently: a filterable `course_id` field so per-course retrieval works.
 *
 * Idempotent: GETs the index definition, only PUTs if `course_id` is missing.
 * Runs at module init in the background (does not block boot).
 */
@Injectable()
export class IndexSchemaService implements OnModuleInit {
  private readonly logger = new Logger(IndexSchemaService.name);
  private ensuring: Promise<EnsureResult> | null = null;
  private lastResult: EnsureResult | null = null;

  onModuleInit() {
    void this.ensureCourseIdField().catch((e) => {
      this.logger.error(
        `Index schema bootstrap failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    });
  }

  getLastResult(): EnsureResult | null {
    return this.lastResult;
  }

  /** Idempotent: adds `course_id` field to index if missing. */
  async ensureCourseIdField(): Promise<EnsureResult> {
    if (this.ensuring) return this.ensuring;
    this.ensuring = this.runEnsure();
    try {
      const res = await this.ensuring;
      this.lastResult = res;
      return res;
    } finally {
      this.ensuring = null;
    }
  }

  private async runEnsure(): Promise<EnsureResult> {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const apiKey = process.env.AZURE_SEARCH_API_KEY;
    const indexName =
      process.env.AZURE_SEARCH_INDEX_NAME || 'index-subul-semantic-v2';

    if (!endpoint || !apiKey) {
      return {
        checked: false,
        added: false,
        reason: 'azure_search_not_configured',
        indexName,
      };
    }

    const baseUrl = `${endpoint.replace(/\/$/, '')}/indexes/${indexName}`;
    const apiVersion = '2023-11-01';

    try {
      const getRes = await fetch(`${baseUrl}?api-version=${apiVersion}`, {
        method: 'GET',
        headers: { 'api-key': apiKey },
      });
      if (!getRes.ok) {
        const body = await getRes.text();
        this.logger.warn(
          `Could not read Azure Search index '${indexName}': ${getRes.status} ${body}`,
        );
        return {
          checked: true,
          added: false,
          reason: `get_${getRes.status}`,
          indexName,
        };
      }
      const def = (await getRes.json()) as { fields?: SearchIndexField[] };
      const fields = def.fields ?? [];
      const hasCourseId = fields.some((f) => f.name === 'course_id');
      if (hasCourseId) {
        return {
          checked: true,
          added: false,
          reason: 'already_exists',
          indexName,
        };
      }

      fields.push({
        name: 'course_id',
        type: 'Edm.String',
        filterable: true,
        retrievable: true,
        searchable: false,
        sortable: false,
        facetable: true,
      });
      (def as Record<string, unknown>).fields = fields;

      const putRes = await fetch(`${baseUrl}?api-version=${apiVersion}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify(def),
      });
      if (!putRes.ok) {
        const body = await putRes.text();
        this.logger.error(
          `Could not add course_id field to '${indexName}': ${putRes.status} ${body}`,
        );
        return {
          checked: true,
          added: false,
          reason: `put_${putRes.status}`,
          indexName,
        };
      }
      this.logger.log(
        `Added 'course_id' filterable field to index '${indexName}'.`,
      );
      return { checked: true, added: true, indexName };
    } catch (e) {
      this.logger.error(
        `Index schema ensure failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return {
        checked: true,
        added: false,
        reason: 'exception',
        indexName,
      };
    }
  }
}

export interface EnsureResult {
  checked: boolean;
  added: boolean;
  reason?: string;
  indexName: string;
}

interface SearchIndexField {
  name: string;
  type: string;
  filterable?: boolean;
  searchable?: boolean;
  retrievable?: boolean;
  sortable?: boolean;
  facetable?: boolean;
  [k: string]: unknown;
}
