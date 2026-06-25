import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './users.dto';

/** Publiczny profil użytkownika wraz z podstawowymi statystykami. */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  documentsCount: number;
}

/**
 * Serwis użytkowników - odczyt profilu ze statystykami oraz aktualizacja danych.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Zwraca profil użytkownika wraz z liczbą utworzonych dokumentów.
   * @throws NotFoundException gdy użytkownik nie istnieje.
   */
  async findById(id: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!user) {
      throw new NotFoundException('Nie znaleziono użytkownika.');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      documentsCount: user._count.documents,
    };
  }

  /** Zwraca użytkownika po adresie e-mail lub null. */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Aktualizuje profil i zwraca świeże dane ze statystykami. */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserProfile> {
    await this.prisma.user.update({ where: { id }, data: { name: dto.name } });
    return this.findById(id);
  }
}
