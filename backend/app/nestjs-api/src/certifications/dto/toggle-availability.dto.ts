import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleAvailabilityDto {
  @IsBoolean()
  @IsNotEmpty()
  available: boolean = false;
}