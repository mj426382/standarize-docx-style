import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto } from './auth.dto';

/**
 * Kontroler uwierzytelniania. Cienka warstwa aplikacji delegująca do AuthService.
 * Endpointy są throttlowane zgodnie z polityką bezpieczeństwa.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Rejestracja nowego konta (email + hasło)' })
  @ApiResponse({ status: 201, description: 'Konto utworzone, zwraca token i dane użytkownika.' })
  @ApiResponse({ status: 409, description: 'Email zajęty lub hasło zbyt słabe.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Logowanie email + hasło' })
  @ApiResponse({ status: 200, description: 'Zwraca token i dane użytkownika.' })
  @ApiResponse({ status: 401, description: 'Nieprawidłowe dane logowania.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Logowanie / rejestracja przez Google OAuth' })
  @ApiResponse({ status: 200, description: 'Zwraca token i dane użytkownika.' })
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Żądanie resetu hasła' })
  @ApiResponse({ status: 200, description: 'Zawsze zwraca tę samą, neutralną odpowiedź.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
}
