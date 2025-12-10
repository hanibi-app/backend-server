import { NotificationType } from './entities/notification-setting.entity';

/**
 * 알림 템플릿 데이터 인터페이스
 */
export interface ProcessingCompletedData {
  amount: number;
  durationMinutes?: number;
}

export interface StateAlertData {
  alertType: 'HIGH_TEMP' | 'LOW_TEMP' | 'HIGH_HUMIDITY' | 'LOW_HUMIDITY' | 'SENSOR_ERROR' | 'DEVICE_OFFLINE';
  value?: number;
  deviceName?: string;
}

export interface CleaningData {
  lastCleanedDays?: number;
}

export interface WeeklyReportData {
  score: number;
  co2Saved: number;
  totalProcessed: number;
  weekNumber?: number;
}

export type NotificationData = 
  | ProcessingCompletedData 
  | StateAlertData 
  | CleaningData 
  | WeeklyReportData;

/**
 * 알림 템플릿 정의
 */
export const NotificationTemplates = {
  [NotificationType.ProcessingCompleted]: {
    getTitle: () => '처리 완료 🎉',
    getMessage: (data: ProcessingCompletedData) => {
      const duration = data.durationMinutes 
        ? ` (${data.durationMinutes}분 소요)` 
        : '';
      return `${data.amount.toFixed(1)}kg 처리 완료!${duration} 환경을 위해 수고했어요 🌱`;
    },
  },

  [NotificationType.StateAlert]: {
    getTitle: (data: StateAlertData) => {
      const titles: Record<string, string> = {
        HIGH_TEMP: '⚠️ 고온 경고',
        LOW_TEMP: '⚠️ 저온 경고',
        HIGH_HUMIDITY: '⚠️ 고습도 경고',
        LOW_HUMIDITY: '⚠️ 저습도 경고',
        SENSOR_ERROR: '🔧 센서 오류',
        DEVICE_OFFLINE: '📡 연결 끊김',
      };
      return titles[data.alertType] ?? '기기 상태 알림';
    },
    getMessage: (data: StateAlertData) => {
      const messages: Record<string, string> = {
        HIGH_TEMP: `온도가 ${data.value}°C로 높아요. 환기가 필요해요!`,
        LOW_TEMP: `온도가 ${data.value}°C로 낮아요. 확인해주세요.`,
        HIGH_HUMIDITY: `습도가 ${data.value}%로 높아요. 환기해주세요!`,
        LOW_HUMIDITY: `습도가 ${data.value}%로 낮아요.`,
        SENSOR_ERROR: '센서에 문제가 발생했어요. 기기를 확인해주세요.',
        DEVICE_OFFLINE: `${data.deviceName ?? '기기'} 연결이 끊어졌어요. 네트워크를 확인해주세요.`,
      };
      return messages[data.alertType] ?? '기기 상태를 확인해주세요.';
    },
  },

  [NotificationType.Cleaning]: {
    getTitle: () => '청소 알림 🧹',
    getMessage: (data: CleaningData) => {
      if (data.lastCleanedDays && data.lastCleanedDays > 7) {
        return `마지막 청소 후 ${data.lastCleanedDays}일이 지났어요! 깨끗하게 관리해주세요.`;
      }
      return '청소가 필요해요! 깨끗하게 관리하면 더 오래 사용할 수 있어요 🧹';
    },
  },

  [NotificationType.WeeklyReport]: {
    getTitle: (data: WeeklyReportData) => {
      const week = data.weekNumber ? `${data.weekNumber}주차` : '이번 주';
      return `📊 ${week} 리포트`;
    },
    getMessage: (data: WeeklyReportData) => {
      const lines = [
        `🏆 환경경 점수: ${data.score}점`,
        `🌍 CO₂ 절약량: ${data.co2Saved.toFixed(1)}kg`,
        `♻️ 총 처리량: ${data.totalProcessed.toFixed(1)}kg`,
      ];
      
      // 점수에 따른 격려 메시지
      if (data.score >= 90) {
        lines.push('\n🎉 최고예요! 환경 영웅이시네요!');
      } else if (data.score >= 70) {
        lines.push('\n👍 잘하고 있어요! 계속 화이팅!');
      } else if (data.score >= 50) {
        lines.push('\n💪 조금 더 노력해봐요!');
      } else {
        lines.push('\n🌱 천천히 시작해봐요!');
      }
      
      return lines.join('\n');
    },
  },
};

/**
 * 알림 생성 헬퍼 함수
 */
export function generateNotification(
  type: NotificationType,
  data: NotificationData,
): { title: string; message: string } {
  const template = NotificationTemplates[type];
  
  if (!template) {
    return {
      title: '알림',
      message: '새로운 알림이 있어요.',
    };
  }

  return {
    title: typeof template.getTitle === 'function' 
      ? template.getTitle(data as any) 
      : template.getTitle,
    message: template.getMessage(data as any),
  };
}

/**
 * 알림 타입별 기본 메시지 (데이터 없을 때)
 */
export const DefaultNotificationMessages: Record<NotificationType, { title: string; message: string }> = {
  [NotificationType.ProcessingCompleted]: {
    title: '처리 완료 🎉',
    message: '음식물 처리가 완료되었어요!',
  },
  [NotificationType.StateAlert]: {
    title: '기기 상태 알림',
    message: '기기 상태를 확인해주세요.',
  },
  [NotificationType.Cleaning]: {
    title: '청소 알림 🧹',
    message: '청소가 필요해요!',
  },
  [NotificationType.WeeklyReport]: {
    title: '주간 리포트 📊',
    message: '이번 주 리포트가 준비되었어요!',
  },
};

