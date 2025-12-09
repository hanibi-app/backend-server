import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import { CameraService } from '../../modules/camera/camera.service';

// FFmpeg 경로 설정
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface StreamSession {
  deviceId: string;
  rtspUrl: string;
  ffmpegProcess: any; // child_process.ChildProcess
  clients: Set<string>;
  frameBuffer: Buffer;
}

interface PendingStreamRequest {
  clientId: string;
  deviceId: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

@WebSocketGateway({
  namespace: 'camera-stream',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class CameraStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(CameraStreamGateway.name);
  private readonly activeStreams = new Map<string, StreamSession>();
  // 동시 스트림 수 제한 (메모리 보호)
  private readonly MAX_CONCURRENT_STREAMS = 5;
  // 대기 중인 스트림 요청 큐 (순차 처리 보장)
  private readonly pendingStreamQueue: PendingStreamRequest[] = [];

  constructor(private readonly cameraService: CameraService) {}

  onModuleInit(): void {
    this.logger.log('CameraStreamGateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`클라이언트 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`클라이언트 해제: ${client.id}`);
    
    // 클라이언트가 연결 해제되면 모든 스트림에서 제거
    for (const [deviceId, session] of this.activeStreams.entries()) {
      if (session.clients.has(client.id)) {
        session.clients.delete(client.id);
        this.logger.debug(`클라이언트 ${client.id} -> device:${deviceId} 스트림 구독 해제`);

        // 더 이상 클라이언트가 없으면 FFmpeg 프로세스 종료
        if (session.clients.size === 0) {
          this.stopStream(deviceId);
        }
      }
    }

    // 대기 중인 요청도 제거 (연결 해제된 클라이언트의 요청)
    const pendingIndex = this.pendingStreamQueue.findIndex((req) => req.clientId === client.id);
    if (pendingIndex !== -1) {
      const pendingRequest = this.pendingStreamQueue[pendingIndex];
      this.pendingStreamQueue.splice(pendingIndex, 1);
      this.logger.debug(`대기 중인 스트림 요청 제거: clientId=${client.id}, deviceId=${pendingRequest.deviceId}`);
      
      // 대기 중인 요청을 에러로 처리 (클라이언트가 연결 해제되었으므로)
      try {
        pendingRequest.reject(new Error('클라이언트 연결이 해제되었습니다.'));
      } catch (error) {
        // 이미 처리된 경우 무시
      }

      // 대기열에서 제거되었으므로 다음 요청 처리 시도
      this.processPendingStreams();
    }
  }

  @SubscribeMessage('startStream')
  async handleStartStream(
    client: Socket,
    payload: { deviceId: string },
  ): Promise<void> {
    const { deviceId } = payload;

    if (!deviceId) {
      client.emit('streamError', { message: 'deviceId는 필수입니다.' });
      return;
    }

    try {
      // 카메라 정보 조회
      const camera = await this.cameraService.getCamera(deviceId);
      let rtspUrl = camera.rtspUrl;

      // RTSP URL에 인증 정보 추가 (필요한 경우)
      if (camera.username && camera.password && !rtspUrl.includes('@')) {
        const urlParts = rtspUrl.replace(/^rtsp(s)?:\/\//, '').split('/');
        const host = urlParts[0];
        const path = '/' + urlParts.slice(1).join('/');
        rtspUrl = `rtsp://${camera.username}:${camera.password}@${host}${path}`;
      }

      // 이미 스트림이 활성화되어 있으면 클라이언트만 추가
      if (this.activeStreams.has(deviceId)) {
        const session = this.activeStreams.get(deviceId)!;
        session.clients.add(client.id);
        client.join(`stream:${deviceId}`);
        this.logger.debug(`클라이언트 ${client.id} -> device:${deviceId} 스트림 구독 (기존 스트림)`);
        client.emit('streamStarted', { deviceId });
        return;
      }

      // 동시 스트림 수 제한 확인 - 대기열에 추가하여 순차 처리
      if (this.activeStreams.size >= this.MAX_CONCURRENT_STREAMS) {
        this.logger.log(
          `스트림 대기열 추가: 현재 ${this.activeStreams.size}/${this.MAX_CONCURRENT_STREAMS}, deviceId=${deviceId}, 대기 순서: ${this.pendingStreamQueue.length + 1}`,
        );
        
        // 대기 상태 알림
        client.emit('streamQueued', {
          deviceId,
          queuePosition: this.pendingStreamQueue.length + 1,
          message: '스트림이 대기열에 추가되었습니다. 순차적으로 처리됩니다.',
        });

        // 대기열에 추가하고 Promise로 대기
        let timeoutId: NodeJS.Timeout | null = null;
        try {
          await new Promise<void>((resolve, reject) => {
            // 타임아웃 설정 (5분)
            timeoutId = setTimeout(() => {
              const index = this.pendingStreamQueue.findIndex(
                (req) => req.clientId === client.id && req.deviceId === deviceId,
              );
              if (index !== -1) {
                this.pendingStreamQueue.splice(index, 1);
                reject(new Error('스트림 대기 시간 초과 (5분)'));
              }
            }, 5 * 60 * 1000);

            this.pendingStreamQueue.push({
              clientId: client.id,
              deviceId,
              resolve: () => {
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }
                resolve();
              },
              reject: (error: Error) => {
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }
                reject(error);
              },
            });
          });

          // 대기열에서 처리되었으므로 다시 시도
          // (이미 스트림이 시작되었을 수 있으므로 다시 확인)
          if (this.activeStreams.has(deviceId)) {
            const session = this.activeStreams.get(deviceId)!;
            session.clients.add(client.id);
            client.join(`stream:${deviceId}`);
            this.logger.debug(`클라이언트 ${client.id} -> device:${deviceId} 스트림 구독 (대기 후 기존 스트림)`);
            client.emit('streamStarted', { deviceId });
            return;
          }

          // 여전히 제한에 걸려있으면 에러 (이론적으로는 발생하지 않아야 함)
          if (this.activeStreams.size >= this.MAX_CONCURRENT_STREAMS) {
            this.logger.error(
              `대기 후에도 스트림 수 제한 초과: 현재 ${this.activeStreams.size}/${this.MAX_CONCURRENT_STREAMS}, deviceId=${deviceId}`,
            );
            client.emit('streamError', {
              message: '스트림을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.',
            });
            return;
          }
        } catch (error) {
          // 타임아웃 또는 다른 에러
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          this.logger.error(`스트림 대기 중 에러: ${error instanceof Error ? error.message : error}`);
          client.emit('streamError', {
            message: error instanceof Error ? error.message : '스트림 대기 중 오류가 발생했습니다.',
          });
          return;
        }
      }

      // 새 스트림 시작
      this.logger.log(`RTSP 스트림 시작: deviceId=${deviceId} (현재 스트림 수: ${this.activeStreams.size + 1}/${this.MAX_CONCURRENT_STREAMS})`);

      const session: StreamSession = {
        deviceId,
        rtspUrl,
        ffmpegProcess: null,
        clients: new Set([client.id]),
        frameBuffer: Buffer.alloc(0),
      };

      client.join(`stream:${deviceId}`);
      this.activeStreams.set(deviceId, session);

      // FFmpeg를 spawn으로 직접 실행하여 stdout에서 MJPEG 프레임 읽기
      const ffmpegPath = ffmpegInstaller.path;
      const ffmpegArgs = [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-f', 'mjpeg',
        '-q:v', '5',
        '-r', '10',
        '-',
      ];

      const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

      ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
        // MJPEG 프레임을 base64로 인코딩하여 전송
        // JPEG 마커(0xFF 0xD8)로 프레임 시작을 감지
        session.frameBuffer = Buffer.concat([session.frameBuffer, chunk]);

        // JPEG 프레임 경계 찾기 (간단한 방법: 일정 크기마다 전송)
        if (session.frameBuffer.length > 10000) {
          const base64Image = session.frameBuffer.toString('base64');
          this.server.to(`stream:${deviceId}`).emit('streamFrame', {
            deviceId,
            image: `data:image/jpeg;base64,${base64Image}`,
          });
          session.frameBuffer = Buffer.alloc(0);
        }
      });

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        // FFmpeg 로그는 stderr로 출력됨 (에러가 아닐 수도 있음)
        const message = data.toString();
        if (message.includes('error') || message.includes('Error')) {
          this.logger.error(`FFmpeg stderr: ${message}`);
        }
      });

      ffmpegProcess.on('error', (err) => {
        this.logger.error(`FFmpeg 프로세스 오류: ${err.message}`, err.stack);
        this.server.to(`stream:${deviceId}`).emit('streamError', {
          message: `스트림 오류: ${err.message}`,
        });
        this.stopStream(deviceId);
      });

      ffmpegProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          this.logger.warn(`FFmpeg 프로세스 종료: code=${code}, deviceId=${deviceId}`);
        }
        this.server.to(`stream:${deviceId}`).emit('streamEnded', { deviceId });
        this.stopStream(deviceId);
      });

      session.ffmpegProcess = ffmpegProcess;
      client.emit('streamStarted', { deviceId });
      this.logger.log(`스트림 시작 완료: deviceId=${deviceId}`);
    } catch (error: any) {
      this.logger.error(`스트림 시작 실패: ${error.message}`, error.stack);
      client.emit('streamError', {
        message: `스트림 시작 실패: ${error.message}`,
      });
    }
  }

  @SubscribeMessage('stopStream')
  handleStopStream(client: Socket, payload: { deviceId: string }): void {
    const { deviceId } = payload;

    if (this.activeStreams.has(deviceId)) {
      const session = this.activeStreams.get(deviceId)!;
      session.clients.delete(client.id);
      client.leave(`stream:${deviceId}`);

      if (session.clients.size === 0) {
        this.stopStream(deviceId);
      }
    }
  }

  private stopStream(deviceId: string): void {
    const session = this.activeStreams.get(deviceId);
    if (!session) {
      return;
    }

    this.logger.log(`스트림 종료: deviceId=${deviceId}`);

    // FFmpeg 프로세스 종료
    if (session.ffmpegProcess) {
      try {
        session.ffmpegProcess.kill('SIGTERM');
        // 강제 종료가 필요한 경우
        setTimeout(() => {
          if (session.ffmpegProcess && !session.ffmpegProcess.killed) {
            session.ffmpegProcess.kill('SIGKILL');
          }
        }, 2000);
      } catch (error) {
        this.logger.warn(`FFmpeg 프로세스 종료 실패: ${error}`);
      }
    }

    this.activeStreams.delete(deviceId);

    // 대기 중인 스트림 요청 처리 (순차적으로)
    this.processPendingStreams();
  }

  /**
   * 대기 중인 스트림 요청을 순차적으로 처리
   */
  private processPendingStreams(): void {
    // 스트림 슬롯이 있고 대기 중인 요청이 있으면 처리
    while (
      this.activeStreams.size < this.MAX_CONCURRENT_STREAMS &&
      this.pendingStreamQueue.length > 0
    ) {
      const pendingRequest = this.pendingStreamQueue.shift();
      if (!pendingRequest) {
        break;
      }

      this.logger.log(
        `대기 중인 스트림 요청 처리: deviceId=${pendingRequest.deviceId}, 대기 순서: ${this.pendingStreamQueue.length + 1}`,
      );

      // 대기 중인 요청 해결 (다시 시도하도록)
      try {
        pendingRequest.resolve();
      } catch (error) {
        this.logger.error(`대기 중인 스트림 요청 처리 실패: ${error}`);
        pendingRequest.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

