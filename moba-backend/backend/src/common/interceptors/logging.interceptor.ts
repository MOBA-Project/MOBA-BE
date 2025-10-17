import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = request.user?._id || request.user?.id || 'Anonymous';

    // 요청 로그
    this.logger.log(
      `📥 [REQUEST] ${method} ${url} | User: ${userId} | UA: ${userAgent}`,
    );

    // Authorization 헤더 확인
    if (headers.authorization) {
      this.logger.debug(`🔑 Authorization: ${headers.authorization.substring(0, 20)}...`);
    } else {
      this.logger.debug('🔓 No Authorization header');
    }

    // Body 로그 (비밀번호 제외)
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) sanitizedBody.password = '***';
      this.logger.debug(`📦 Body: ${JSON.stringify(sanitizedBody)}`);
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `📤 [RESPONSE] ${method} ${url} | ${responseTime}ms | Success`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `❌ [ERROR] ${method} ${url} | ${responseTime}ms | ${error.status || 500} ${error.message}`,
          );
          if (error.stack) {
            this.logger.error(`Stack: ${error.stack}`);
          }
        },
      }),
    );
  }
}
