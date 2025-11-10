import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CaptureTriggerDto, CaptureTriggerType } from './dto/capture-trigger.dto';
import { RegisterCameraDto } from './dto/register-camera.dto';
import { SnapshotQueryDto } from './dto/snapshot-query.dto';

export interface CameraInfo {
  deviceId: string;
  rtspUrl: string;
  cameraModel?: string;
  username?: string;
  password?: string;
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastConnectedAt?: string;
}

export interface SnapshotInfo {
  snapshotId: string;
  deviceId: string;
  sessionId?: string;
  snapshotType: CaptureTriggerType;
  imageUrl: string;
  capturedAt: string;
  latencyMs?: number;
}

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);
  private readonly cameras = new Map<string, CameraInfo>();
  private readonly snapshots: SnapshotInfo[] = [];

  async registerCamera(payload: RegisterCameraDto): Promise<CameraInfo> {
    const info: CameraInfo = {
      deviceId: payload.deviceId,
      rtspUrl: payload.rtspUrl,
      cameraModel: payload.cameraModel,
      username: payload.username,
      password: payload.password,
      connectionStatus: 'ONLINE',
      lastConnectedAt: new Date().toISOString(),
    };

    this.cameras.set(payload.deviceId, info);
    this.logger.log(`카메라 등록: deviceId=${payload.deviceId}`);

    return info;
  }

  async getCamera(deviceId: string): Promise<CameraInfo> {
    const camera = this.cameras.get(deviceId);
    if (!camera) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라 정보를 찾을 수 없습니다.`);
    }
    return camera;
  }

  async removeCamera(deviceId: string): Promise<void> {
    if (!this.cameras.has(deviceId)) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라 정보를 찾을 수 없습니다.`);
    }

    this.cameras.delete(deviceId);
    this.logger.warn(`카메라 해제: deviceId=${deviceId}`);
  }

  async getStreamUrl(deviceId: string): Promise<{ rtspUrl: string }> {
    const camera = await this.getCamera(deviceId);
    return { rtspUrl: camera.rtspUrl };
  }

  async captureSnapshot(payload: CaptureTriggerDto): Promise<SnapshotInfo> {
    const camera = await this.getCamera(payload.deviceId);
    const snapshot: SnapshotInfo = {
      snapshotId: `snapshot-${Date.now()}`,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
      snapshotType: payload.triggerType,
      imageUrl: `/snapshots/${payload.deviceId}/${Date.now()}.jpg`,
      capturedAt: new Date().toISOString(),
      latencyMs: Math.floor(Math.random() * 1000),
    };

    this.logger.log(
      `스냅샷 캡처: deviceId=${payload.deviceId}, trigger=${payload.triggerType}, rtsp=${camera.rtspUrl}`,
    );
    this.snapshots.push(snapshot);

    return snapshot;
  }

  async listSnapshots(deviceId: string, query: SnapshotQueryDto): Promise<SnapshotInfo[]> {
    const { from, to, limit = 20 } = query;
    const fromTime = from ? new Date(from).getTime() : 0;
    const toTime = to ? new Date(to).getTime() : Date.now();

    return this.snapshots
      .filter((snapshot) => {
        return (
          snapshot.deviceId === deviceId &&
          new Date(snapshot.capturedAt).getTime() >= fromTime &&
          new Date(snapshot.capturedAt).getTime() <= toTime
        );
      })
      .slice(0, limit);
  }
}

