import { Injectable, LogLevel, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, Logger, transports } from 'winston';

const { combine, timestamp, errors, json, splat, printf } = format;

@Injectable()
export class WinstonLoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private readonly logLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];

  constructor(private readonly configService: ConfigService) {
    const level = configService.get<string>('LOG_LEVEL', 'debug');
    const environment = configService.get<string>('NODE_ENV', 'development');

    const consoleFormat =
      environment === 'production'
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            errors({ stack: true }),
            splat(),
            printf(({ level: lvl, message, timestamp: ts, stack, context, ...meta }) => {
              const contextLabel = context ? `[${context}] ` : '';
              const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              const stackTrace = stack ? `\n${stack}` : '';
              return `${ts} ${lvl.toUpperCase()} ${contextLabel}${message}${metaString}${stackTrace}`;
            }),
          );

    this.logger = createLogger({
      level,
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      },
      transports: [new transports.Console({ format: consoleFormat })],
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  setLogLevels(levels: LogLevel[]): void {
    this.logger.level = levels[0] ?? this.logger.level;
  }

  get supportedLogLevels(): LogLevel[] {
    return this.logLevels;
  }
}

