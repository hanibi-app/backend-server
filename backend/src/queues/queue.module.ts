import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const useMock =
          nodeEnv === 'test' ||
          configService.get<string>('REDIS_MOCK', nodeEnv !== 'production' ? 'true' : 'false') === 'true';

        let connection: any;

        if (useMock) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { default: RedisMock } = require('ioredis-mock');
          connection = new RedisMock();
        } else {
          const url = configService.get<string>('REDIS_URL');
          connection = url
            ? { url }
            : {
                host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
                port: configService.get<number>('REDIS_PORT', 6379),
                username: configService.get<string>('REDIS_USERNAME'),
                password: configService.get<string>('REDIS_PASSWORD'),
                db: configService.get<number>('REDIS_DB', 0),
              };
        }

        return {
          connection,
          defaultJobOptions: {
            attempts: 3,
            removeOnComplete: 100,
            removeOnFail: 10,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

