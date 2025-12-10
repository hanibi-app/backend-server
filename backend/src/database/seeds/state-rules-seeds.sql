-- =============================================
-- 캐릭터 상태 규칙 (Character State Rules) 시드 데이터
-- =============================================

-- 기존 데이터 삭제
DELETE FROM character_state_history;
DELETE FROM character_state_rules;

-- 시퀀스 리셋
ALTER SEQUENCE character_state_rules_id_seq RESTART WITH 1;

-- 캐릭터 상태 규칙 정의
-- triggerConditions: 상태 전환 조건 (JSON)
-- messageTemplate: 캐릭터가 표시할 메시지
-- emotionAnimation: 프론트엔드에서 사용할 애니메이션 키
-- priority: 높을수록 우선 적용

INSERT INTO character_state_rules ("stateName", description, "triggerConditions", "messageTemplate", "emotionAnimation", priority, "isActive", created_at, updated_at) VALUES

-- 기본 상태들
('IDLE', '기본 대기 상태', 
 '{"processingStatus": "IDLE"}', 
 '안녕! 오늘도 환경을 지켜볼까?', 
 'idle_float', 
 1, true, NOW(), NOW()),

-- 작업 관련 상태
('WORKING', '음식물 처리 중', 
 '{"processingStatus": "PROCESSING"}', 
 '열심히 처리하고 있어요! 조금만 기다려주세요 💪', 
 'working_spin', 
 50, true, NOW(), NOW()),

('WORKING_HARD', '많은 양 처리 중', 
 '{"processingStatus": "PROCESSING", "weight": {"gt": 300}}', 
 '와, 오늘은 양이 많네요! 더 열심히 해볼게요!', 
 'working_fast', 
 55, true, NOW(), NOW()),

-- 감정 상태들
('HAPPY', '기분 좋음', 
 '{"processingStatus": "IDLE", "recentCompleted": true}', 
 '처리 완료! 오늘도 환경을 지켰어요 🌱', 
 'happy_bounce', 
 30, true, NOW(), NOW()),

('PROUD', '뿌듯함', 
 '{"weeklyProcessed": {"gt": 5}}', 
 '이번 주에 정말 많이 처리했어요! 대단해요!', 
 'proud_shine', 
 35, true, NOW(), NOW()),

('HUNGRY', '음식물 기다림', 
 '{"processingStatus": "IDLE", "lastInputHours": {"gt": 24}}', 
 '배가 고파요~ 음식물을 넣어주세요!', 
 'hungry_wiggle', 
 25, true, NOW(), NOW()),

('SLEEPY', '졸림', 
 '{"hour": {"gte": 22, "lte": 6}}', 
 '졸려요... zzZ', 
 'sleepy_nod', 
 20, true, NOW(), NOW()),

-- 환경 관련 상태
('HOT', '더움', 
 '{"temperature": {"gt": 35}}', 
 '앗, 좀 더워요! 환기가 필요해요 🥵', 
 'hot_sweat', 
 40, true, NOW(), NOW()),

('HUMID', '습함', 
 '{"humidity": {"gt": 80}}', 
 '습도가 높아요. 환기해주세요!', 
 'humid_drip', 
 40, true, NOW(), NOW()),

('FRESH', '상쾌함', 
 '{"temperature": {"gte": 20, "lte": 25}, "humidity": {"gte": 40, "lte": 60}}', 
 '날씨가 딱 좋아요! 기분 최고!', 
 'fresh_sparkle', 
 15, true, NOW(), NOW()),

-- 특수 상태
('FULL', '가득 참', 
 '{"weight": {"gt": 800}}', 
 '배가 너무 불러요! 곧 비워주세요~', 
 'full_bloat', 
 45, true, NOW(), NOW()),

('ERROR', '오류 발생', 
 '{"processingStatus": "ERROR"}', 
 '앗, 뭔가 이상해요. 확인해주세요!', 
 'error_shake', 
 100, true, NOW(), NOW()),

('OFFLINE', '연결 끊김', 
 '{"connectionStatus": "OFFLINE"}', 
 '연결이 끊어졌어요...', 
 'offline_fade', 
 90, true, NOW(), NOW()),

-- 칭찬/격려 상태
('ENCOURAGE', '격려', 
 '{"streak": {"gte": 7}}', 
 '7일 연속! 정말 대단해요! 🎉', 
 'encourage_cheer', 
 60, true, NOW(), NOW()),

('ECO_HERO', '환경 영웅', 
 '{"totalCO2Saved": {"gt": 10}}', 
 '당신은 진정한 환경 영웅이에요! 🦸', 
 'hero_cape', 
 70, true, NOW(), NOW());
