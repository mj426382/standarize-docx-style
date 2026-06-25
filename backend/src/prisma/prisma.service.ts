import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Serwis bazy danych oparty o Prisma Client.
 * Zarządza cyklem życia połączenia w ramach modułu NestJS.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Nawiązuje połączenie z bazą podczas startu modułu. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Zamyka połączenie z bazą podczas zatrzymania modułu. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
