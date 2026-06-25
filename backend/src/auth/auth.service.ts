import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto } from './auth.dto';

/** Lista popularnych słabych haseł blokowanych przy rejestracji. */
const COMMON_WEAK_PASSWORDS = [
  'password',
  'haslo123',
  'qwerty123',
  '12345678',
  'admin123',
  'iloveyou',
  'password1',
];

/** Wynik uwierzytelnienia zwracany do klienta. */
export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string | null };
}

/**
 * Serwis uwierzytelniania: rejestracja, logowanie email/hasło, Google OAuth oraz reset hasła.
 * Komunikaty błędów są po polsku, a odpowiedzi chronią przed enumeracją kont.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  /**
   * Rejestruje nowego użytkownika po walidacji unikalności emaila i siły hasła.
   * @throws ConflictException gdy email już istnieje lub hasło jest zbyt słabe/oczywiste.
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Konto z tym adresem e-mail już istnieje.');
    }

    const emailPrefix = dto.email.split('@')[0]?.toLowerCase() ?? '';
    const lowerPassword = dto.password.toLowerCase();
    if (emailPrefix.length >= 3 && lowerPassword.includes(emailPrefix)) {
      throw new ConflictException('Hasło nie może zawierać fragmentu adresu e-mail.');
    }
    if (COMMON_WEAK_PASSWORDS.includes(lowerPassword)) {
      throw new ConflictException('To hasło jest zbyt popularne. Wybierz inne.');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name ?? null },
    });

    return this.buildResult(user);
  }

  /**
   * Loguje użytkownika na podstawie emaila i hasła.
   * @throws UnauthorizedException gdy dane są nieprawidłowe.
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) {
      this.logger.warn(`Nieudana próba logowania dla: ${dto.email}`);
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      this.logger.warn(`Nieudana próba logowania (błędne hasło) dla: ${dto.email}`);
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło.');
    }

    return this.buildResult(user);
  }

  /**
   * Loguje lub rejestruje użytkownika przez Google OAuth na podstawie tokenu ID.
   * @throws UnauthorizedException gdy token Google jest nieprawidłowy.
   */
  async googleLogin(dto: GoogleLoginDto): Promise<AuthResult> {
    const ticket = await this.googleClient
      .verifyIdToken({
        idToken: dto.credential,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      })
      .catch(() => null);

    const payload = ticket?.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Nie udało się zweryfikować konta Google.');
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user && !user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId } });
    } else if (!user) {
      user = await this.prisma.user.create({
        data: { email, googleId, name: payload.name ?? null },
      });
    }

    return this.buildResult(user);
  }

  /**
   * Inicjuje reset hasła. Zawsze zwraca tę samą odpowiedź (ochrona przed enumeracją kont).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user) {
      // W produkcji: wygeneruj token resetu i wyślij e-mail. Tutaj jedynie logujemy.
      this.logger.log(`Żądanie resetu hasła dla istniejącego konta: ${dto.email}`);
    }
    return {
      message: 'Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła na podany adres e-mail.',
    };
  }

  /** Generuje token JWT dla wskazanego użytkownika. */
  private generateToken(userId: string, email: string): string {
    return this.jwt.sign({ sub: userId, email });
  }

  /** Buduje ujednoliconą odpowiedź uwierzytelnienia. */
  private buildResult(user: { id: string; email: string; name: string | null }): AuthResult {
    return {
      token: this.generateToken(user.id, user.email),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
