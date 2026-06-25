import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard chroniący endpointy wymagające ważnego tokenu JWT. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
