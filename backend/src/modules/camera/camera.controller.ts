import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CameraService } from './camera.service';
import { CaptureTriggerDto } from './dto/capture-trigger.dto';
import { RegisterCameraDto } from './dto/register-camera.dto';
import { SnapshotQueryDto } from './dto/snapshot-query.dto';

@ApiTags('Camera')
@Controller({
  path: 'cameras',
  version: '1',
})
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Post()
  @ApiOperation({
    summary: '카메라 등록',
    description: '기기에 연결된 IP 카메라 정보를 등록합니다.',
  })
  async register(@Body() payload: RegisterCameraDto) {
    const data = await this.cameraService.registerCamera(payload);
    return {
      success: true,
      data,
    };
  }

  @Get(':deviceId')
  @ApiOperation({
    summary: '카메라 조회',
  })
  async get(@Param('deviceId') deviceId: string) {
    const data = await this.cameraService.getCamera(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Delete(':deviceId')
  @ApiOperation({
    summary: '카메라 해제',
  })
  async remove(@Param('deviceId') deviceId: string) {
    await this.cameraService.removeCamera(deviceId);
    return {
      success: true,
    };
  }

  @Get(':deviceId/stream')
  @ApiOperation({
    summary: 'RTSP 스트림 URL 조회',
  })
  async stream(@Param('deviceId') deviceId: string) {
    const data = await this.cameraService.getStreamUrl(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post(':deviceId/capture')
  @ApiOperation({
    summary: '스냅샷 캡처',
    description: '카메라 스트림에서 이미지를 캡처합니다.',
  })
  async capture(
    @Param('deviceId') deviceId: string,
    @Body() payload: CaptureTriggerDto,
  ) {
    const data = await this.cameraService.captureSnapshot({
      ...payload,
      deviceId,
    });
    return {
      success: true,
      data,
    };
  }

  @Get(':deviceId/snapshots')
  @ApiOperation({
    summary: '스냅샷 목록 조회',
  })
  async snapshots(
    @Param('deviceId') deviceId: string,
    @Query() query: SnapshotQueryDto,
  ) {
    const data = await this.cameraService.listSnapshots(deviceId, query);
    return {
      success: true,
      data,
    };
  }
}

