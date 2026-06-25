import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';

/**
 * Główny moduł aplikacji. Spina konfigurację, throttling oraz moduły domenowe.
 * Aplikacja realizuje jedną funkcję: formatowanie dokumentów - brak modułu płatności.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 30 }],
      // W trybie testów E2E pomijamy throttling (wiele rejestracji w krótkim czasie).
      skipIf: () => process.env.E2E === 'true',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StorageModule,
    DocumentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
