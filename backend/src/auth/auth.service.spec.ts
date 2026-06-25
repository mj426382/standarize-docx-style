import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('jwt-token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('client-id') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('tworzy konto i zwraca token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: '1', email: 'jan@example.com', name: 'Jan' });

      const result = await service.register({
        email: 'jan@example.com',
        password: 'Silne#Haslo1',
        name: 'Jan',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user.email).toBe('jan@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('odrzuca duplikat emaila', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(
        service.register({ email: 'jan@example.com', password: 'Silne#Haslo1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('odrzuca popularne słabe hasło', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.register({ email: 'jan@example.com', password: 'password' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('odrzuca hasło zawierające fragment emaila', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.register({ email: 'janek@example.com', password: 'janek#Haslo1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('loguje przy poprawnym haśle', async () => {
      const hash = await bcrypt.hash('Silne#Haslo1', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'jan@example.com',
        name: 'Jan',
        password: hash,
      });

      const result = await service.login({ email: 'jan@example.com', password: 'Silne#Haslo1' });
      expect(result.token).toBe('jwt-token');
    });

    it('odrzuca błędne hasło', async () => {
      const hash = await bcrypt.hash('Inne#Haslo1', 12);
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@b.pl', password: hash });
      await expect(
        service.login({ email: 'a@b.pl', password: 'Zle#Haslo1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('odrzuca nieistniejące konto', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@b.pl', password: 'Cokolwiek#1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('zawsze zwraca neutralną odpowiedź', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'x@b.pl' });
      expect(result.message).toContain('Jeśli konto istnieje');
    });
  });
});
