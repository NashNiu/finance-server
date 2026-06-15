import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // CORS: unset CORS_ORIGIN to reflect any origin (fine for same-origin nginx
  // deploys and local dev). Set a comma-separated allowlist to lock it down
  // when the frontend is served from a different origin than the API.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim())
      : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Bind to all interfaces in dev; set HOST=127.0.0.1 in production so the API
  // is only reachable through the nginx reverse proxy, not directly.
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();
