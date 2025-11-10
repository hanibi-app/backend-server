import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type RedisClient = Redis;

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const resolveBoolean = (value: string | boolean | undefined, defaultValue: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly client: RedisClient,
  ) {}

  static createClient(configService: ConfigService): RedisClient {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const useMock = resolveBoolean(
      configService.get<string | boolean>('REDIS_MOCK'),
      nodeEnv !== 'production',
    );

    if (useMock || nodeEnv === 'test') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { default: RedisMock } = require('ioredis-mock');
      return new RedisMock();
    }

    const url = configService.get<string>('REDIS_URL');
    if (url) {
      return new Redis(url, { lazyConnect: true });
    }

    return new Redis({
      lazyConnect: true,
      host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: configService.get<number>('REDIS_PORT', 6379),
      username: configService.get<string>('REDIS_USERNAME'),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_DB', 0),
    });
  }

  getClient(): RedisClient {
    return this.client;
  }

  async ensureConnected(): Promise<void> {
    if (!this.client.status || this.client.status === 'connecting' || this.client.status === 'ready') {
      return;
    }

    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }

    await this.client.quit();
  }
}

