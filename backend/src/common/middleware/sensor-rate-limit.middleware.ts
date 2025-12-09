import rateLimit from 'express-rate-limit';

// 센서 데이터 전송 API 전용 Rate Limit
// 센서가 5초마다 데이터 전송 시: 1시간 = 720개, 15분 = 180개
// 여유를 두어 15분당 300개로 설정
export const sensorDataRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 300, // 15분당 최대 300개 요청
  standardHeaders: true,
  legacyHeaders: false,
  // POST 요청에만 적용 (GET 조회는 제외)
  skip: (req) => req.method !== 'POST',
  // deviceId 기반으로 Rate Limit 적용
  keyGenerator: (req) => {
    const deviceId = req.body?.deviceId || req.ip;
    return `sensor-data:${deviceId}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: '센서 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      deviceId: req.body?.deviceId,
    });
  },
});

// 일반 API용 Rate Limit (더 엄격함)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 15분당 최대 100개 요청
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 센서 API는 제외
    if (req.path.includes('/sensors')) return true;
    // 정적 파일은 제외
    if (req.path.startsWith('/public/')) return true;
    // Swagger 문서는 제외
    if (req.path.startsWith('/docs')) return true;
    return false;
  },
});

