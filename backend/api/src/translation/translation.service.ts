import { Injectable, Logger } from '@nestjs/common';

export interface LessonFields {
  title: string;
  content: string;
  bullets: string[];
}

export interface LabContentFields {
  title: string;
  description: string;
  tasks: string[];
  learningObjectives: string[];
}

export interface ExamQuestionFields {
  prompt: string;
  options: Array<{ id: string; text: string }>;
  explanation: string | null;
}

/**
 * Translates educational content using Azure OpenAI Chat Completions.
 * On any failure (unconfigured, network error, parse error) returns the
 * original fields unchanged so the caller always gets usable content.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  private get config() {
    const endpoint =
      process.env.TUTOR_AZURE_OPENAI_ENDPOINT ||
      process.env.AZURE_OPENAI_CHAT_ENDPOINT ||
      process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey =
      process.env.TUTOR_AZURE_OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY;
    const deployment =
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o';
    const apiVersion =
      process.env.TUTOR_AZURE_OPENAI_API_VERSION ||
      process.env.AZURE_OPENAI_API_VERSION ||
      '2024-12-01-preview';
    return { endpoint, apiKey, deployment, apiVersion };
  }

  isConfigured(): boolean {
    const { endpoint, apiKey } = this.config;
    return Boolean(endpoint && apiKey);
  }

  private localeName(locale: string): string {
    const map: Record<string, string> = {
      en: 'English',
      fr: 'French',
      ar: 'Arabic',
      es: 'Spanish',
      de: 'German',
    };
    return map[locale] ?? locale;
  }

  private async callChatCompletion(
    systemPrompt: string,
    userContent: string,
    maxTokens: number,
  ): Promise<string> {
    const { endpoint, apiKey, deployment, apiVersion } = this.config;
    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI not configured for translation');
    }

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Translation API error (${res.status}): ${body}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? '';
  }

  private buildSystemPrompt(targetLocale: string): string {
    const lang = this.localeName(targetLocale);
    return (
      `You are a professional educational content translator. ` +
      `Translate the provided JSON content to ${lang}. ` +
      `Preserve markdown, code blocks, and technical/cloud certification terms unchanged. ` +
      `Return ONLY valid JSON with identical keys, no explanation.`
    );
  }

  async translateLesson(fields: LessonFields, targetLocale: string): Promise<LessonFields> {
    if (!this.isConfigured()) return fields;
    try {
      const raw = await this.callChatCompletion(
        this.buildSystemPrompt(targetLocale),
        JSON.stringify({ title: fields.title, content: fields.content, bullets: fields.bullets }),
        2000,
      );
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as Partial<LessonFields>;
      return {
        title: parsed.title ?? fields.title,
        content: parsed.content ?? fields.content,
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets : fields.bullets,
      };
    } catch (err) {
      this.logger.warn(`[translateLesson] Failed for locale "${targetLocale}": ${(err as Error).message}`);
      return fields;
    }
  }

  async translateLabFields(fields: LabContentFields, targetLocale: string): Promise<LabContentFields> {
    if (!this.isConfigured()) return fields;
    try {
      const raw = await this.callChatCompletion(
        this.buildSystemPrompt(targetLocale),
        JSON.stringify({
          title: fields.title,
          description: fields.description,
          tasks: fields.tasks,
          learningObjectives: fields.learningObjectives,
        }),
        1500,
      );
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as Partial<LabContentFields>;
      return {
        title: parsed.title ?? fields.title,
        description: parsed.description ?? fields.description,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : fields.tasks,
        learningObjectives: Array.isArray(parsed.learningObjectives)
          ? parsed.learningObjectives
          : fields.learningObjectives,
      };
    } catch (err) {
      this.logger.warn(`[translateLabFields] Failed for locale "${targetLocale}": ${(err as Error).message}`);
      return fields;
    }
  }

  async translateExamQuestion(
    fields: ExamQuestionFields,
    targetLocale: string,
  ): Promise<ExamQuestionFields> {
    if (!this.isConfigured()) return fields;
    try {
      const raw = await this.callChatCompletion(
        this.buildSystemPrompt(targetLocale),
        JSON.stringify({
          prompt: fields.prompt,
          options: fields.options,
          explanation: fields.explanation,
        }),
        600,
      );
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as Partial<ExamQuestionFields>;
      return {
        prompt: parsed.prompt ?? fields.prompt,
        options: Array.isArray(parsed.options) ? parsed.options : fields.options,
        explanation: parsed.explanation !== undefined ? parsed.explanation : fields.explanation,
      };
    } catch (err) {
      this.logger.warn(`[translateExamQuestion] Failed for locale "${targetLocale}": ${(err as Error).message}`);
      return fields;
    }
  }
}
