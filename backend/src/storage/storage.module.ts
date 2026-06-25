import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Globalny moduł storage (B2/S3 z fallbackiem lokalnym). */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
