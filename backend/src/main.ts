import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Punkt wejścia aplikacji DokFormat API.
 * Konfiguruje globalną walidację, CORS, statyczne pliki uploadów oraz Swaggera.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Globalna walidacja DTO na granicy systemu.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      frontendUrl,
      'https://app.dokformat.pl',
      'https://dokformat.pl',
    ],
    credentials: true,
  });

  // Lokalne uploady serwowane pod /api/uploads (fallback storage).
  app.useStaticAssets('/app/uploads', { prefix: '/api/uploads' });

  // Swagger / OpenAPI.
  const config = new DocumentBuilder()
    .setTitle('DokFormat API')
    .setDescription('API do formatowania dokumentów Word przy pomocy AI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, swaggerDoc);

  const port = process.env.PORT ?? 3026;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`DokFormat API uruchomione na porcie ${port}`);
}

void bootstrap();
