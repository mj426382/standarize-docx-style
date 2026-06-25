import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Aktualizacja profilu zalogowanego użytkownika. */
export class UpdateProfileDto {
  @ApiProperty({ example: 'Jan Kowalski', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
