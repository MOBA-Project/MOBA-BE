import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { json, urlencoded } from 'express';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'], // 모든 로그 레벨 활성화
  });

  const logger = new Logger('Bootstrap');

  // Prevent OOM: limit inbound body size and constrain axios
  const jsonLimit = process.env.JSON_BODY_LIMIT || '1mb';
  const urlLimit = process.env.URLENCODED_BODY_LIMIT || '1mb';
  app.use(json({ limit: jsonLimit }));
  app.use(urlencoded({ extended: true, limit: urlLimit }));

  axios.defaults.timeout = Number(process.env.AXIOS_TIMEOUT || 7000);
  // @ts-ignore
  axios.defaults.maxContentLength = Number(process.env.AXIOS_MAX_CONTENT_LENGTH || 10 * 1024 * 1024);
  // @ts-ignore
  axios.defaults.maxBodyLength = Number(process.env.AXIOS_MAX_BODY_LENGTH || 10 * 1024 * 1024);

  // 글로벌 로깅 인터셉터
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 글로벌 Validation Pipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());
  app.enableCors({
    origin: true, // 모든 origin 허용 (개발/테스트용)
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['Set-Cookie'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('MOBA Movie API')
    .setDescription('The Movie information API built with NestJS')
    .setVersion('1.0')
    .addTag('movies')
    .addTag('reviews')
    .addTag('리뷰 댓글 (Review Comments)')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // localhost:4000/api-docs

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger UI available at: http://localhost:${port}/api-docs`);
}
bootstrap();
