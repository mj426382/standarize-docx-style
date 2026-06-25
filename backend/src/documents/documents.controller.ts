import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService, UploadedFile as DocFile } from './documents.service';
import {
  CreateFromTextDto,
  EditDocumentDto,
  ListDocumentsQueryDto,
  SaveContentDto,
} from './documents.dto';

/** Limit rozmiaru uploadu (10 MB). */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Kontroler dokumentów. Wszystkie endpointy chronione JWT.
 * Cienka warstwa aplikacji delegująca do DocumentsService.
 */
@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('text')
  @ApiOperation({ summary: 'Utwórz dokument z wklejonego tekstu' })
  @ApiResponse({ status: 201, description: 'Zwraca id utworzonego dokumentu.' })
  createFromText(@CurrentUser('userId') userId: string, @Body() dto: CreateFromTextDto) {
    return this.documentsService.createFromText(userId, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Utwórz dokument z pliku .txt lub .docx' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        const allowed = ['text/plain', MIME_DOCX];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  createFromFile(@CurrentUser('userId') userId: string, @UploadedFile() file: DocFile) {
    return this.documentsService.createFromFile(userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Lista dokumentów użytkownika (paginacja)' })
  list(@CurrentUser('userId') userId: string, @Query() query: ListDocumentsQueryDto) {
    return this.documentsService.listDocuments(userId, query.page ?? 1, query.limit ?? 12);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Pobierz dokument z najnowszą wersją (HTML do podglądu)' })
  getOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.documentsService.getDocument(userId, id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Historia wersji dokumentu' })
  versions(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.documentsService.getVersions(userId, id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Pobierz najnowszy .docx do edytora (inline)' })
  async file(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer } = await this.documentsService.downloadDocx(userId, id);
    res.set({
      'Content-Type': MIME_DOCX,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  }

  @Put(':id/file')
  @ApiOperation({ summary: 'Zapisz wyeksportowany z edytora .docx jako nową wersję' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => cb(null, file.mimetype === MIME_DOCX),
    }),
  )
  saveFile(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: DocFile,
  ) {
    return this.documentsService.saveEditedDocx(userId, id, file.buffer);
  }

  @Post(':id/standardize')
  @ApiOperation({ summary: 'Ujednolić styl dokumentu przez AI (na żądanie użytkownika)' })
  standardize(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.documentsService.standardizeStyle(userId, id);
  }

  @Post(':id/edit')
  @ApiOperation({ summary: 'Edytuj dokument poleceniem (prompt)' })
  edit(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: EditDocumentDto,
  ) {
    return this.documentsService.editByPrompt(userId, id, dto.instruction);
  }

  @Put(':id/content')
  @ApiOperation({ summary: 'Zapisz ręczną edycję treści (HTML)' })
  saveContent(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SaveContentDto,
  ) {
    return this.documentsService.saveManualEdit(userId, id, dto.html);
  }

  @Post(':id/restore/:versionNo')
  @ApiOperation({ summary: 'Przywróć wskazaną wersję dokumentu' })
  restore(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('versionNo', ParseIntPipe) versionNo: number,
  ) {
    return this.documentsService.restoreVersion(userId, id, versionNo);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Pobierz dokument jako .docx (proxy)' })
  async download(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
    @Query('versionNo') versionNo?: string,
  ) {
    const { buffer, filename } = await this.documentsService.downloadDocx(
      userId,
      id,
      versionNo ? Number(versionNo) : undefined,
    );
    // Content-Disposition: nazwa pliku może zawierać polskie znaki (poza ISO-8859-1),
    // co rzuca "Invalid character in header content". Stosujemy RFC 5987:
    // ASCII fallback w filename= oraz filename*=UTF-8'' z procentowym kodowaniem.
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
    const encodedFilename = encodeURIComponent(filename);
    res.set({
      'Content-Type': MIME_DOCX,
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Usuń dokument' })
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.documentsService.deleteDocument(userId, id);
  }
}
