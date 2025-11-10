import { plainToInstance } from 'class-transformer';
import { IsBooleanString, IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_USERNAME?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  @IsBooleanString()
  @IsOptional()
  DB_SYNCHRONIZE?: string;

  @IsBooleanString()
  @IsOptional()
  DB_LOGGING?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_USERNAME?: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @IsOptional()
  REDIS_DB?: number;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;

  @IsBooleanString()
  @IsOptional()
  REDIS_MOCK?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRATION?: string;
}

export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};

