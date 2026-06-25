import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Ładunek JWT przenoszony w tokenie. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Strategia Passport JWT - waliduje token Bearer i udostępnia użytkownika w `req.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  /** Mapuje payload tokenu na obiekt użytkownika dostępny w żądaniu. */
  async validate(payload: JwtPayload): Promise<{ userId: string; email: string }> {
    return { userId: payload.sub, email: payload.email };
  }
}
