import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleAvailabilityDto {
  @ApiProperty({ example: true, description: 'Rendre la certification disponible (true) ou indisponible (false)' })
  @IsBoolean()
  @IsNotEmpty()
  available: boolean = false;
}
