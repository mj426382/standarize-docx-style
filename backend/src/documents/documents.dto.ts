import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/** Tworzenie dokumentu z wklejonego tekstu. */
export class CreateFromTextDto {
  @ApiProperty({ example: 'Raport kwartalny', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: 'Surowy tekst do sformatowania' })
  @IsString()
  @MinLength(1, { message: 'Tekst nie może być pusty.' })
  @MaxLength(100000, { message: 'Tekst jest zbyt długi (maks. 100 000 znaków).' })
  rawText: string;
}

/** Edycja dokumentu poleceniem (prompt). */
export class EditDocumentDto {
  @ApiProperty({ example: 'Pogrub wszystkie nagłówki sekcji.' })
  @IsString()
  @MinLength(3, { message: 'Polecenie jest zbyt krótkie.' })
  @MaxLength(1000, { message: 'Polecenie jest zbyt długie (maks. 1000 znaków).' })
  instruction: string;
}

/** Zapis ręcznej edycji treści (HTML z edytora WYSIWYG). */
export class SaveContentDto {
  @ApiProperty({ description: 'Sformatowany HTML dokumentu' })
  @IsString()
  @MaxLength(500000)
  html: string;
}

/** Parametry paginacji listy dokumentów. */
export class ListDocumentsQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 12;
}
