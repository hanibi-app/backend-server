import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USERNAME = 'postgres';
const DEFAULT_DB_PASSWORD = 'postgres';
const DEFAULT_DB_NAME = 'hanibi';

const resolveBoolean = (value: string | boolean | undefined, defaultValue: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
};

export const buildTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';
  const isDev = nodeEnv === 'development';
  const isTest = nodeEnv === 'test';

  if (isTest) {
    return {
      type: 'sqlite',
      database: ':memory:',
      autoLoadEntities: true,
      synchronize: true,
      logging: false,
    };
  }

  const url = configService.get<string>('DATABASE_URL');

  // 개발 환경에서는 기본적으로 synchronize 활성화 (DB_SYNCHRONIZE가 명시되지 않은 경우)
  const defaultSynchronize = isDev ? true : false;
  const parsedSynchronize = resolveBoolean(
    configService.get<string | boolean>('DB_SYNCHRONIZE'),
    defaultSynchronize,
  );

  const parsedLogging = resolveBoolean(
    configService.get<string | boolean>('DB_LOGGING'),
    !isProd,
  );

  // synchronize가 true일 때 로깅 활성화하여 스키마 변경 확인
  const shouldLogQueries = parsedSynchronize || parsedLogging;

  // 데이터베이스 연결 풀 제한 (메모리 보호)
  const extra = {
    max: 10, // 최대 연결 수
    min: 2, // 최소 연결 수
    maxQueryExecutionTime: 5000, // 쿼리 타임아웃 5초
  };

  if (url) {
    return {
      type: 'postgres',
      url,
      autoLoadEntities: true,
      synchronize: parsedSynchronize,
      logging: shouldLogQueries ? ['query', 'error', 'schema'] : parsedLogging,
      extra,
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', DEFAULT_DB_HOST),
    port: configService.get<number>('DB_PORT', DEFAULT_DB_PORT),
    username: configService.get<string>('DB_USERNAME', DEFAULT_DB_USERNAME),
    password: configService.get<string>('DB_PASSWORD', DEFAULT_DB_PASSWORD),
    database: configService.get<string>('DB_NAME', DEFAULT_DB_NAME),
    autoLoadEntities: true,
    synchronize: parsedSynchronize,
    logging: shouldLogQueries ? ['query', 'error', 'schema'] : parsedLogging,
    extra,
  };
};

