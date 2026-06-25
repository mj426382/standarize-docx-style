import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Reguły siły hasła używane przy rejestracji i resecie. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

/** Dane rejestracji nowego konta. */
export class RegisterDto {
  @ApiProperty({ example: 'jan.kowalski@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Podaj poprawny adres e-mail.' })
  email: string;

  @ApiProperty({ example: 'Silne#Haslo1' })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `Hasło musi mieć co najmniej ${PASSWORD_MIN} znaków.` })
  @MaxLength(PASSWORD_MAX, { message: `Hasło może mieć maksymalnie ${PASSWORD_MAX} znaków.` })
  @Matches(/[a-z]/, { message: 'Hasło musi zawierać małą literę.' })
  @Matches(/[A-Z]/, { message: 'Hasło musi zawierać wielką literę.' })
  @Matches(/[0-9]/, { message: 'Hasło musi zawierać cyfrę.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Hasło musi zawierać znak specjalny.' })
  password: string;

  @ApiProperty({ example: 'Jan Kowalski', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

/** Dane logowania email + hasło. */
export class LoginDto {
  @ApiProperty({ example: 'jan.kowalski@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Podaj poprawny adres e-mail.' })
  email: string;

  @ApiProperty({ example: 'Silne#Haslo1' })
  @IsString()
  @MinLength(1, { message: 'Hasło jest wymagane.' })
  password: string;
}

/** Token Google ID do logowania przez Google. */
export class GoogleLoginDto {
  @ApiProperty({ description: 'Token Google ID (credential)' })
  @IsString()
  @MinLength(10)
  credential: string;
}

/** Żądanie resetu hasła. */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'jan.kowalski@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Podaj poprawny adres e-mail.' })
  email: string;
}

/** Reset hasła z tokenem. */
export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'Nowe#Haslo1' })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `Hasło musi mieć co najmniej ${PASSWORD_MIN} znaków.` })
  @MaxLength(PASSWORD_MAX, { message: `Hasło może mieć maksymalnie ${PASSWORD_MAX} znaków.` })
  @Matches(/[a-z]/, { message: 'Hasło musi zawierać małą literę.' })
  @Matches(/[A-Z]/, { message: 'Hasło musi zawierać wielką literę.' })
  @Matches(/[0-9]/, { message: 'Hasło musi zawierać cyfrę.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Hasło musi zawierać znak specjalny.' })
  newPassword: string;
}
