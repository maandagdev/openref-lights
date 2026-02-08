import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN || '*';

  // Enable CORS for frontend
  // Only enable credentials when a specific origin is set (not wildcard)
  app.enableCors({
    origin: corsOrigin,
    credentials: corsOrigin !== '*',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
}

bootstrap();
