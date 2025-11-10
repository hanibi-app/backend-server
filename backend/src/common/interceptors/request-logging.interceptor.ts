import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Repository } from 'typeorm';
import {
  SensorRequestLog,
  SensorRequestStatus,
} from '../../modules/sensors/entities/sensor-request-log.entity';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(
    @InjectRepository(SensorRequestLog)
    private readonly requestLogRepository: Repository<SensorRequestLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    const deviceId = request.body?.deviceId || 'UNKNOWN';
    const rawRequest = JSON.stringify(request.body);
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async (response) => {
        const responseTime = Date.now() - startTime;

        try {
          const logEntry = this.requestLogRepository.create({
            deviceId,
            rawRequest,
            status: SensorRequestStatus.Success,
            ipAddress,
            userAgent,
            httpStatus: 200,
            responseTimeMs: responseTime,
          });

          await this.requestLogRepository.save(logEntry);
        } catch (error) {
          this.logger.error('Failed to save request log', error);
        }
      }),
      catchError(async (error) => {
        const responseTime = Date.now() - startTime;
        const isValidationError = error.status === 400;

        try {
          const logEntry = this.requestLogRepository.create({
            deviceId,
            rawRequest,
            status: isValidationError
              ? SensorRequestStatus.ValidationFailed
              : SensorRequestStatus.Error,
            errorMessage: error.message || error.toString(),
            ipAddress,
            userAgent,
            httpStatus: error.status || 500,
            responseTimeMs: responseTime,
          });

          await this.requestLogRepository.save(logEntry);
        } catch (logError) {
          this.logger.error('Failed to save error log', logError);
        }

        throw error;
      }),
    );
  }
}

