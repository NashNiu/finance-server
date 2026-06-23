import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

// Long-running server entry (local dev, Render, containers). On Vercel the app
// is served by api/[...path].js as a serverless function instead.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();
