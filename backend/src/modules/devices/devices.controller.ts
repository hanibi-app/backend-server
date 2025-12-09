import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { DevicesService } from './devices.service';
import { PairDeviceDto } from './dto/pair-device.dto';
import { SendCommandDto } from './dto/send-command.dto';
import { UnpairDeviceDto } from './dto/unpair-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@ApiTags('Devices')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'devices',
  version: '1',
})
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('pair')
  @ApiOperation({ summary: '기기 페어링' })
  async pairDevice(@CurrentUser() user: User, @Body() payload: PairDeviceDto) {
    const device = await this.devicesService.pairDevice(user, payload);
    return {
      success: true,
      data: device,
    };
  }

  @Delete('pair')
  @ApiOperation({ summary: '기기 페어링 해제' })
  async unpairDevice(@CurrentUser() user: User, @Body() payload: UnpairDeviceDto) {
    const device = await this.devicesService.unpairDevice(user, payload.deviceId);
    return {
      success: true,
      data: device,
    };
  }

  @Get()
  @ApiOperation({ summary: '내 기기 목록 조회' })
  async listDevices(@CurrentUser() user: User) {
    const devices = await this.devicesService.findAllByUser(user.id);
    return {
      success: true,
      data: devices,
    };
  }

  @Get(':deviceId')
  @ApiOperation({ summary: '기기 상세 조회' })
  async getDevice(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    const device = await this.devicesService.findOneByUser(user.id, deviceId);
    return {
      success: true,
      data: device,
    };
  }

  @Patch(':deviceId')
  @ApiOperation({ summary: '기기 정보 수정' })
  async updateDevice(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() payload: UpdateDeviceDto,
  ) {
    await this.devicesService.findOneByUser(user.id, deviceId);
    const updated = await this.devicesService.updateDevice(deviceId, payload);
    return {
      success: true,
      data: updated,
    };
  }

  @Post(':deviceId/commands')
  @ApiOperation({ summary: '기기 제어 명령 전송' })
  async sendCommand(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() payload: SendCommandDto,
  ) {
    const device = await this.devicesService.findOneByUser(user.id, deviceId);
    const command = await this.devicesService.sendCommand({
      device,
      user,
      commandType: payload.commandType,
      payload: this.buildPayload(payload),
    });
    return {
      success: true,
      data: command,
    };
  }

  @Get(':deviceId/commands')
  @ApiOperation({ summary: '기기 제어 명령 이력' })
  async listCommands(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    await this.devicesService.findOneByUser(user.id, deviceId);
    const commands = await this.devicesService.listCommands(deviceId);
    return {
      success: true,
      data: commands,
    };
  }

  @Get(':deviceId/commands/pending')
  @ApiOperation({ summary: '기기 제어 대기 명령 (디바이스용)' })
  async listPendingCommands(@Param('deviceId') deviceId: string) {
    const commands = await this.devicesService.listPendingCommands(deviceId);
    return {
      success: true,
      data: commands,
    };
  }

  @Patch(':deviceId/commands/:commandId/ack')
  @ApiOperation({ summary: '기기 제어 명령 응답 (디바이스용)' })
  async acknowledgeCommand(
    @Param('deviceId') deviceId: string,
    @Param('commandId') commandId: string,
    @Body('status') status: 'ACKED' | 'FAILED' = 'ACKED',
  ) {
    const command = await this.devicesService.acknowledgeCommand(deviceId, commandId, status);
    return {
      success: true,
      data: command,
    };
  }

  private buildPayload(payload: SendCommandDto): Record<string, any> | undefined {
    const base: Record<string, any> = {};
    if (payload.temperature !== undefined) {
      base.temperature = payload.temperature;
    }
    if (payload.intervalSeconds !== undefined) {
      base.intervalSeconds = payload.intervalSeconds;
    }
    if (payload.extraPayload) {
      Object.assign(base, payload.extraPayload);
    }
    return Object.keys(base).length ? base : undefined;
  }
}

