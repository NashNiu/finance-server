import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      message =
        typeof r === 'string'
          ? r
          : (r as any).message
            ? Array.isArray((r as any).message)
              ? (r as any).message.join(', ')
              : (r as any).message
            : exception.message;
    }

    res.status(status).json({ code: status, message, data: null });
  }
}
