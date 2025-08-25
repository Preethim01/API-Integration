// src/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as fs from 'fs/promises'; // 💡 Use the promises version for async/await
import * as path from 'path';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logFilePath = path.join(__dirname, '..', 'logs', 'http.log');

  private async writeLog(logData: any) {
    try {
      // Ensure the logs directory exists
      await fs.mkdir(path.dirname(this.logFilePath), { recursive: true });
      const logEntry = JSON.stringify(logData) + '\n';
      await fs.appendFile(this.logFilePath, logEntry);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;

    const requestLog = {
      timestamp: new Date().toISOString(),
      type: 'request',
      method,
      url,
      requestBody: body,
    };
    this.writeLog(requestLog);

    return next.handle().pipe(
      tap((responseBody) => {
        const responseLog = {
          timestamp: new Date().toISOString(),
          type: 'response',
          method,
          url,
          responseBody,
        };
        this.writeLog(responseLog);
      }),
    );
  }
}