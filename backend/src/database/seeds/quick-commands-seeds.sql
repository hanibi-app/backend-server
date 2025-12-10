-- =============================================
-- 빠른 명령 (Quick Commands) 시드 데이터
-- =============================================

-- 기존 데이터 삭제
DELETE FROM quick_commands;

-- 시퀀스 리셋
ALTER SEQUENCE quick_commands_id_seq RESTART WITH 1;

-- 빠른 명령 정의
-- action: 'namespace:action' 형태
-- payload: 추가 파라미터 (JSON)

INSERT INTO quick_commands (label, action, payload, "sortOrder", "isActive", created_at, updated_at) VALUES

-- 기기 제어 명령
('처리 시작', 'device:start', NULL, 1, true, NOW(), NOW()),
('처리 중지', 'device:stop', NULL, 2, true, NOW(), NOW()),
('일시 정지', 'device:pause', NULL, 3, true, NOW(), NOW()),
('다시 시작', 'device:resume', NULL, 4, true, NOW(), NOW()),

-- 상태 조회 명령
('현재 상태', 'query:status', NULL, 5, true, NOW(), NOW()),
('오늘 처리량', 'query:today_stats', NULL, 6, true, NOW(), NOW()),
('이번 주 리포트', 'query:weekly_report', NULL, 7, true, NOW(), NOW()),

-- 설정 명령
('저온 모드', 'device:set_temperature', '{"temperature": 20}', 8, true, NOW(), NOW()),
('일반 모드', 'device:set_temperature', '{"temperature": 30}', 9, true, NOW(), NOW()),
('고온 모드', 'device:set_temperature', '{"temperature": 40}', 10, true, NOW(), NOW()),

-- 기타 명령
('도움말', 'query:help', NULL, 11, true, NOW(), NOW()),
('환경 팁', 'query:eco_tips', NULL, 12, true, NOW(), NOW());
