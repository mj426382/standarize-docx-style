import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Globalny moduł udostępniający PrismaService w całej aplikacji.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
