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
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  const isTest = configService.get<string>('NODE_ENV') === 'test';

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

  const parsedSynchronize = resolveBoolean(
    configService.get<string | boolean>('DB_SYNCHRONIZE'),
    false,
  );

  const parsedLogging = resolveBoolean(
    configService.get<string | boolean>('DB_LOGGING'),
    !isProd,
  );

  if (url) {
    return {
      type: 'postgres',
      url,
      autoLoadEntities: true,
      synchronize: parsedSynchronize,
      logging: parsedLogging,
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
    logging: parsedLogging,
  };
};

