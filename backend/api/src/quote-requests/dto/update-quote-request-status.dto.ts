import { IsEnum } from 'class-validator';
import { QuoteRequestStatus } from '../entities/quote-request.entity';

export class UpdateQuoteRequestStatusDto {
  @IsEnum(['pending', 'contacted', 'closed'])
  status!: QuoteRequestStatus;
}
