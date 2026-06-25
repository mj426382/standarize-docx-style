import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OpenAiLlmService } from './adapters/openai-llm.service';
import { DocxConverterService } from './adapters/docx-converter.service';
import { LLM_PORT } from './ports/llm.port';
import { DOCUMENT_CONVERTER_PORT } from './ports/document-converter.port';

/**
 * Moduł dokumentów (rdzeń aplikacji).
 * Wiąże porty domenowe (LLM, konwerter) z konkretnymi adapterami infrastruktury.
 */
@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: LLM_PORT, useClass: OpenAiLlmService },
    { provide: DOCUMENT_CONVERTER_PORT, useClass: DocxConverterService },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
