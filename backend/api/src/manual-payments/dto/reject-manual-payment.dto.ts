import { IsOptional, IsString } from 'class-validator';

export class RejectManualPaymentDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
