import { Body, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequestLoggingInterceptor } from '../../common/interceptors/request-logging.interceptor';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { SensorDataDto } from './dto/sensor-data.dto';
import { SensorEventDto, SensorEventType } from './dto/sensor-event.dto';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@Controller({
  path: 'sensors',
  version: '1',
})
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post('data')
  @UseInterceptors(RequestLoggingInterceptor)
  @ApiOperation({
    summary: '센서 데이터 수신',
    description: '하드웨어가 주기적으로 센서 데이터를 전송할 때 호출합니다.',
  })
  async ingestSensorData(@Body() payload: SensorDataDto) {
    const result = await this.sensorsService.processSensorData(payload);
    return {
      success: true,
      ...result,
    };
  }

  @Post('heartbeat')
  @ApiOperation({
    summary: '하트비트',
    description: '기기 연결 상태를 확인하기 위한 하트비트 요청입니다.',
  })
  async heartbeat(@Body() payload: HeartbeatDto) {
    const result = await this.sensorsService.processHeartbeat(payload);
    return {
      success: true,
      ...result,
    };
  }

  @Post('events')
  @ApiOperation({
    summary: '센서 이벤트',
    description: '처리 완료, 음식물 투입 등 주요 이벤트를 전달합니다.',
  })
  async handleEvent(@Body() payload: SensorEventDto) {
    const result = await this.sensorsService.handleEvent(payload);
    return {
      success: true,
      ...result,
    };
  }

  @Post('events/food-input-before')
  @ApiOperation({
    summary: '음식물 투입 전 이벤트',
  })
  async handleFoodInputBefore(@Body() payload: SensorEventDto) {
    const result = await this.sensorsService.handleEvent({
      ...payload,
      eventType: SensorEventType.FoodInputBefore,
    });
    return {
      success: true,
      ...result,
    };
  }

  @Post('events/food-input-after')
  @ApiOperation({
    summary: '음식물 투입 후 이벤트',
  })
  async handleFoodInputAfter(@Body() payload: SensorEventDto) {
    const result = await this.sensorsService.handleEvent({
      ...payload,
      eventType: SensorEventType.FoodInputAfter,
    });
    return {
      success: true,
      ...result,
    };
  }

  @Get(':deviceId/latest')
  @ApiOperation({
    summary: '최신 센서 데이터 조회',
  })
  async getLatest(@Param('deviceId') deviceId: string) {
    const data = await this.sensorsService.getLatestSensorData(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Get('request-logs')
  @ApiOperation({
    summary: '센서 요청 로그 조회',
    description: '센서 API 요청 로그를 조회합니다. 디버깅 및 모니터링 용도.',
  })
  @ApiQuery({ name: 'deviceId', required: false, description: '특정 디바이스 ID로 필터링' })
  @ApiQuery({ name: 'status', required: false, description: '요청 상태로 필터링 (SUCCESS, VALIDATION_FAILED, ERROR)' })
  @ApiQuery({ name: 'limit', required: false, description: '조회할 로그 개수 (기본: 50)', type: Number })
  async getRequestLogs(
    @Query('deviceId') deviceId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.sensorsService.getRequestLogs(deviceId, status, limit);
    return {
      success: true,
      data: logs,
    };
  }
}

