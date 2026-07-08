import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSearchChatMessage } from './entities/job-search-chat-message.entity';

export type JobSearchChatHistoryItem = { role: string; content: string };

@Injectable()
export class JobSearchChatService {
  constructor(
    @InjectRepository(JobSearchChatMessage)
    private readonly repo: Repository<JobSearchChatMessage>,
  ) {}

  async getHistoryForUser(userId: number): Promise<JobSearchChatHistoryItem[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: 500,
    });
    return rows.map((r) => ({ role: r.role, content: r.content }));
  }

  async clearForUser(userId: number): Promise<void> {
    await this.repo.delete({ userId });
  }

  async appendExchange(userId: number, userContent: string, assistantContent: string): Promise<void> {
    const u = userContent.trim();
    if (!u) return;
    await this.repo.manager.transaction(async (em) => {
      await em.insert(JobSearchChatMessage, {
        userId,
        role: 'user',
        content: u,
        metadata: null,
      });
      await em.insert(JobSearchChatMessage, {
        userId,
        role: 'assistant',
        content: assistantContent,
        metadata: null,
      });
    });
  }
}
