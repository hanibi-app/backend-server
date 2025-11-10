import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/api/v1/sensors/data (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sensors/data')
      .send({
        deviceId: 'TEST-DEVICE-001',
        timestamp: new Date().toISOString(),
        sensorData: {
          temperature: 24.5,
          humidity: 55,
        },
        processingStatus: 'PROCESSING',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.config).toBeDefined();
  });
});
