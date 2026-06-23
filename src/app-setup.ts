import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

// Shared Nest configuration used by both the long-running server (main.ts) and
// the Vercel serverless handler (api/[...path].js), so they behave identically.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  // CORS: unset CORS_ORIGIN to reflect any origin (fine for same-origin setups
  // and local dev). Set a comma-separated allowlist to lock it down when the
  // frontend is served from a different origin than the API.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}
