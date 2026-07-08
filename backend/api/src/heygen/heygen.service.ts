import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HeygenService {
  private readonly logger = new Logger(HeygenService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('HEYGEN_API_KEY') ?? '';
  }

  async createStreamingToken(): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('HeyGen API key not configured');
    }
    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      this.logger.error(`HeyGen token request failed: ${res.status} ${res.statusText}`);
      throw new ServiceUnavailableException('Failed to create HeyGen streaming token');
    }
    const body = await res.json();
    const token = body?.data?.token as string | undefined;
    if (!token) {
      throw new ServiceUnavailableException('HeyGen returned an empty token');
    }
    return token;
  }
}
