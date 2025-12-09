import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { Response } from 'express';
import { DevicesService } from '../devices/devices.service';
import { Device, DeviceConnectionStatus } from '../devices/entities/device.entity';
import { CaptureTriggerDto, CaptureTriggerType } from './dto/capture-trigger.dto';
import { RegisterCameraDto } from './dto/register-camera.dto';
import { SnapshotQueryDto } from './dto/snapshot-query.dto';
import { Snapshot, CaptureTriggerType as SnapshotTriggerType } from './entities/snapshot.entity';

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
  snapshotType: CaptureTriggerType;
  imageUrl: string;
  capturedAt: string;
  latencyMs?: number;
}

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);
  private readonly snapshotsBasePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly devicesService: DevicesService,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
  ) {
    // 스냅샷 저장 경로 설정 (환경 변수 또는 기본값)
    this.snapshotsBasePath =
      this.configService.get<string>('SNAPSHOTS_DIR') ||
      path.join(process.cwd(), 'snapshots');
  }

  async registerCamera(payload: RegisterCameraDto): Promise<CameraInfo> {
    // Device를 찾기 (생성하지 않음)
    const device = await this.devicesService.findByDeviceId(payload.deviceId);

    // 이미 카메라 정보가 등록되어 있는지 확인
    if (device && device.rtspUrl) {
      throw new BadRequestException(`이미 등록된 deviceId입니다: ${payload.deviceId}`);
    }

    // Device가 없으면 생성
    if (!device) {
      await this.devicesService.findOrCreateByDeviceId(payload.deviceId);
    }

    // 카메라 정보 업데이트
    const updatedDevice = await this.devicesService.updateCameraInfo(
      payload.deviceId,
      payload.rtspUrl,
      payload.cameraModel,
      payload.username,
      payload.password,
    );

    this.logger.log(`카메라 등록: deviceId=${payload.deviceId}`);

    return {
      deviceId: updatedDevice.deviceId,
      rtspUrl: updatedDevice.rtspUrl || '',
      cameraModel: updatedDevice.cameraModel || undefined,
      username: updatedDevice.cameraUsername || undefined,
      password: updatedDevice.cameraPassword || undefined,
      connectionStatus: updatedDevice.connectionStatus,
      lastConnectedAt: updatedDevice.lastHeartbeat?.toISOString(),
    };
  }

  async getCamera(deviceId: string): Promise<CameraInfo> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라 정보를 찾을 수 없습니다.`);
    }

    return {
      deviceId: device.deviceId,
      rtspUrl: device.rtspUrl || '',
      cameraModel: device.cameraModel || undefined,
      username: device.cameraUsername || undefined,
      password: device.cameraPassword || undefined,
      connectionStatus: device.connectionStatus,
      lastConnectedAt: device.lastHeartbeat?.toISOString(),
    };
  }

  async removeCamera(deviceId: string): Promise<void> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라 정보를 찾을 수 없습니다.`);
    }

    // 카메라 정보 제거
    await this.devicesService.removeCameraInfo(deviceId);
    this.logger.warn(`카메라 해제: deviceId=${deviceId}`);
  }

  async getStreamUrl(deviceId: string): Promise<{ rtspUrl: string }> {
    const camera = await this.getCamera(deviceId);
    return { rtspUrl: camera.rtspUrl };
  }

  async captureSnapshot(
    payload: CaptureTriggerDto & { imageFile?: { buffer: Buffer; size: number; originalname: string } },
  ): Promise<SnapshotInfo> {
    const deviceId = payload.deviceId || '';
    if (!deviceId) {
      throw new NotFoundException('deviceId는 필수입니다.');
    }

    const device = await this.devicesService.findOrCreateByDeviceId(deviceId);
    if (!device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라가 등록되지 않았습니다.`);
    }

    const timestamp = Date.now();
    const snapshotId = `snapshot-${timestamp}`;
    const capturedAt = new Date();

    // 이미지 파일 저장
    let imageUrl: string;
    if (payload.imageFile) {
      const deviceDir = path.join(this.snapshotsBasePath, deviceId);
      const filename = `${timestamp}.jpg`;
      const filePath = path.join(deviceDir, filename);

      if (!fs.existsSync(deviceDir)) {
        fs.mkdirSync(deviceDir, { recursive: true });
        this.logger.log(`스냅샷 디렉토리 생성: ${deviceDir}`);
      }

      fs.writeFileSync(filePath, payload.imageFile.buffer);
      imageUrl = `/snapshots/${deviceId}/${filename}`;

      this.logger.log(
        `이미지 파일 저장 완료: ${filePath} (${payload.imageFile.size} bytes)`,
      );
    } else {
      imageUrl = `/snapshots/${deviceId}/${timestamp}.jpg`;
      this.logger.warn(`이미지 파일이 제공되지 않음: deviceId=${deviceId}`);
    }

    // DB에 스냅샷 저장
    const snapshot = this.snapshotRepository.create({
      snapshotId,
      device,
      snapshotType: payload.triggerType as SnapshotTriggerType,
      imageUrl,
      capturedAt,
      latencyMs: payload.imageFile ? Math.floor(Math.random() * 1000) : undefined,
    });

    await this.snapshotRepository.save(snapshot);

    this.logger.log(
      `스냅샷 캡처: deviceId=${deviceId}, trigger=${payload.triggerType}, rtsp=${device.rtspUrl}, imageSaved=${!!payload.imageFile}`,
    );

    return {
      snapshotId,
      deviceId,
      snapshotType: payload.triggerType,
      imageUrl,
      capturedAt: capturedAt.toISOString(),
      latencyMs: snapshot.latencyMs,
    };
  }

  async listSnapshots(deviceId: string, query: SnapshotQueryDto): Promise<SnapshotInfo[]> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device) {
      throw new NotFoundException(`deviceId=${deviceId} 디바이스를 찾을 수 없습니다.`);
    }

    const { from, to, limit = 20 } = query;
    const queryBuilder = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .leftJoinAndSelect('snapshot.device', 'device')
      .where('snapshot.device = :deviceId', { deviceId: device.id })
      .orderBy('snapshot.capturedAt', 'DESC')
      .limit(limit);

    if (from) {
      queryBuilder.andWhere('snapshot.capturedAt >= :from', { from: new Date(from) });
    }
    if (to) {
      queryBuilder.andWhere('snapshot.capturedAt <= :to', { to: new Date(to) });
    }

    const snapshots = await queryBuilder.getMany();

    return snapshots.map((s) => ({
      snapshotId: s.snapshotId,
      deviceId: s.device?.deviceId || deviceId,
      snapshotType: s.snapshotType as CaptureTriggerType,
      imageUrl: s.imageUrl,
      capturedAt: s.capturedAt.toISOString(),
      latencyMs: s.latencyMs,
    }));
  }

  async getSnapshot(snapshotId: string): Promise<SnapshotInfo> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { snapshotId },
      relations: ['device'],
    });

    if (!snapshot) {
      throw new NotFoundException(`스냅샷을 찾을 수 없습니다: snapshotId=${snapshotId}`);
    }

    return {
      snapshotId: snapshot.snapshotId,
      deviceId: snapshot.device.deviceId,
      snapshotType: snapshot.snapshotType as CaptureTriggerType,
      imageUrl: snapshot.imageUrl,
      capturedAt: snapshot.capturedAt.toISOString(),
      latencyMs: snapshot.latencyMs,
    };
  }

  async getSnapshotImagePath(snapshotId: string): Promise<string> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { snapshotId },
      relations: ['device'],
    });

    if (!snapshot) {
      throw new NotFoundException(`스냅샷을 찾을 수 없습니다: snapshotId=${snapshotId}`);
    }

    const filename = path.basename(snapshot.imageUrl);
    return path.join(this.snapshotsBasePath, snapshot.device.deviceId, filename);
  }

  async captureSnapshotFromStream(
    deviceId: string,
    triggerType: CaptureTriggerType,
  ): Promise<SnapshotInfo> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라가 등록되지 않았습니다.`);
    }

    const rtspUrl = device.rtspUrl;
    const timestamp = Date.now();
    const snapshotId = `snapshot-${timestamp}`;
    const capturedAt = new Date();

    // 스냅샷 저장 경로 설정
    const deviceDir = path.join(this.snapshotsBasePath, deviceId);
    if (!fs.existsSync(deviceDir)) {
      fs.mkdirSync(deviceDir, { recursive: true });
      this.logger.log(`스냅샷 디렉토리 생성: ${deviceDir}`);
    }

    const filename = `${timestamp}.jpg`;
    const filePath = path.join(deviceDir, filename);
    const imageUrl = `/snapshots/${deviceId}/${filename}`;

    // FFmpeg를 사용하여 RTSP 스트림에서 단일 프레임 캡처
    return new Promise((resolve, reject) => {
      const ffmpegPath = ffmpegInstaller.path;
      const ffmpegArgs = [
        '-rtsp_transport',
        'tcp',
        '-rtsp_flags',
        'prefer_tcp',
        '-stimeout',
        '5000000',
        '-i',
        rtspUrl,
        '-vframes',
        '1',
        '-q:v',
        '2',
        '-f',
        'image2',
        '-y',
        filePath,
      ];

      const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
      let stderrOutput = '';

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        stderrOutput += data.toString();
      });

      ffmpegProcess.on('error', (err) => {
        this.logger.error(`FFmpeg 프로세스 오류: ${err.message}`, err.stack);
        reject(new BadRequestException(`스냅샷 캡처 실패: ${err.message}`));
      });

      ffmpegProcess.on('exit', async (code) => {
        if (code !== 0) {
          this.logger.error(`FFmpeg 종료 코드: ${code}, stderr: ${stderrOutput}`);
          reject(
            new BadRequestException(
              `스냅샷 캡처 실패: FFmpeg 오류 (code=${code})\n${stderrOutput}`,
            ),
          );
          return;
        }

        // 파일이 생성되었는지 확인
        if (!fs.existsSync(filePath)) {
          reject(new BadRequestException('스냅샷 파일이 생성되지 않았습니다.'));
          return;
        }

        // DB에 스냅샷 저장
        const snapshot = this.snapshotRepository.create({
          snapshotId,
          device,
          snapshotType: triggerType as SnapshotTriggerType,
          imageUrl,
          capturedAt,
          latencyMs: undefined,
        });

        await this.snapshotRepository.save(snapshot);

        this.logger.log(
          `RTSP 스트림에서 스냅샷 캡처 완료: deviceId=${deviceId}, trigger=${triggerType}, filePath=${filePath}`,
        );

        resolve({
          snapshotId,
          deviceId,
          snapshotType: triggerType,
          imageUrl,
          capturedAt: capturedAt.toISOString(),
          latencyMs: snapshot.latencyMs,
        });
      });
    });
  }

  async testStreamConnection(deviceId: string): Promise<{ connected: boolean; message: string }> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라가 등록되지 않았습니다.`);
    }

    const rtspUrl = device.rtspUrl;

    return new Promise((resolve) => {
      const ffmpegPath = ffmpegInstaller.path;
      const ffmpegArgs = [
        '-rtsp_transport',
        'tcp',
        '-rtsp_flags',
        'prefer_tcp',
        '-stimeout',
        '5000000',
        '-i',
        rtspUrl,
        '-vframes',
        '1',
        '-f',
        'null',
        '-',
      ];

      const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
      let stderrOutput = '';
      const timeout = setTimeout(() => {
        ffmpegProcess.kill('SIGTERM');
        setTimeout(() => {
          ffmpegProcess.kill('SIGKILL');
        }, 2000);
        resolve({
          connected: false,
          message: 'RTSP 스트림 연결 타임아웃 (5초)',
        });
      }, 5000);

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        stderrOutput += data.toString();
      });

      ffmpegProcess.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          connected: false,
          message: `FFmpeg 프로세스 오류: ${err.message}`,
        });
      });

      ffmpegProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve({
            connected: true,
            message: 'RTSP 스트림 연결 성공',
          });
        } else {
          resolve({
            connected: false,
            message: `RTSP 스트림 연결 실패 (code=${code}): ${stderrOutput.substring(0, 200)}`,
          });
        }
      });
    });
  }

  async streamMJPEG(deviceId: string, res: Response): Promise<void> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라가 등록되지 않았습니다.`);
    }

    const rtspUrl = device.rtspUrl;

    // HTTP 헤더 설정
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');

    const ffmpegPath = ffmpegInstaller.path;
    const ffmpegArgs = [
      '-rtsp_transport',
      'tcp',
      '-rtsp_flags',
      'prefer_tcp',
      '-stimeout',
      '5000000',
      '-i',
      rtspUrl,
      '-f',
      'mjpeg',
      '-vcodec',
      'mjpeg',
      '-q:v',
      '5',
      '-r',
      '10',
      '-vf',
      'scale=1280:720',
      '-an',
      '-loglevel',
      'warning',
      '-fflags',
      'nobuffer',
      '-strict',
      'experimental',
      '-',
    ];

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
    let frameBuffer = Buffer.alloc(0);
    const JPEG_MARKER = Buffer.from([0xff, 0xd8]);

    ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);

      // JPEG 프레임 경계 찾기
      let markerIndex = frameBuffer.indexOf(JPEG_MARKER, 1);
      while (markerIndex !== -1) {
        const frame = frameBuffer.slice(0, markerIndex);
        if (frame.length > 0) {
          try {
            res.write(frame);
          } catch (err) {
            this.logger.warn(`응답 쓰기 실패: ${err}`);
            ffmpegProcess.kill('SIGTERM');
            return;
          }
        }
        frameBuffer = frameBuffer.slice(markerIndex);
        markerIndex = frameBuffer.indexOf(JPEG_MARKER, 1);
      }
    });

    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      if (message.includes('error') || message.includes('Error')) {
        this.logger.error(`FFmpeg stderr: ${message}`);
      }
    });

    ffmpegProcess.on('error', (err) => {
      this.logger.error(`FFmpeg 프로세스 오류: ${err.message}`, err.stack);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: `스트림 오류: ${err.message}`,
        });
      }
      ffmpegProcess.kill('SIGTERM');
      setTimeout(() => {
        ffmpegProcess.kill('SIGKILL');
      }, 2000);
    });

    ffmpegProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.logger.warn(`FFmpeg 프로세스 종료: code=${code}, deviceId=${deviceId}`);
      }
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: `스트림 종료: FFmpeg 프로세스가 종료되었습니다 (code=${code})`,
        });
      }
    });

    res.on('close', () => {
      this.logger.log(`클라이언트 연결 종료: deviceId=${deviceId}`);
      ffmpegProcess.kill('SIGTERM');
      setTimeout(() => {
        ffmpegProcess.kill('SIGKILL');
      }, 2000);
    });
  }
}
