-- =============================================
-- 캐릭터 속성 (Character Attributes) 시드 데이터
-- =============================================

-- 기존 데이터 삭제 (순서 중요: 외래키 참조 순서대로)
DELETE FROM user_character_attributes;
DELETE FROM attribute_options;
DELETE FROM character_attributes;

-- 시퀀스 리셋
ALTER SEQUENCE character_attributes_id_seq RESTART WITH 1;
ALTER SEQUENCE attribute_options_id_seq RESTART WITH 1;

-- 1. 캐릭터 속성 정의
INSERT INTO character_attributes ("attributeName", description, "isRequired", "sortOrder", "isActive", created_at, updated_at) VALUES
('피부색', '캐릭터의 피부 색상을 선택하세요', true, 1, true, NOW(), NOW()),
('눈 모양', '캐릭터의 눈 스타일을 선택하세요', true, 2, true, NOW(), NOW()),
('입 모양', '캐릭터의 입 스타일을 선택하세요', true, 3, true, NOW(), NOW()),
('악세서리', '캐릭터의 악세서리를 선택하세요', false, 4, true, NOW(), NOW()),
('배경', '캐릭터의 배경을 선택하세요', false, 5, true, NOW(), NOW());

-- 2. 피부색 옵션 (attribute_id = 1)
INSERT INTO attribute_options (attribute_id, "optionValue", "displayName", "imageUrl", description, "sortOrder", "isActive", created_at, updated_at) VALUES
(1, 'skin_cream', '크림색', '/assets/character/skin/cream.png', '밝고 따뜻한 크림색 피부', 1, true, NOW(), NOW()),
(1, 'skin_peach', '복숭아색', '/assets/character/skin/peach.png', '화사한 복숭아색 피부', 2, true, NOW(), NOW()),
(1, 'skin_tan', '황갈색', '/assets/character/skin/tan.png', '건강한 황갈색 피부', 3, true, NOW(), NOW()),
(1, 'skin_brown', '갈색', '/assets/character/skin/brown.png', '따뜻한 갈색 피부', 4, true, NOW(), NOW()),
(1, 'skin_green', '초록색', '/assets/character/skin/green.png', '자연친화적인 초록색 피부', 5, true, NOW(), NOW());

-- 3. 눈 모양 옵션 (attribute_id = 2)
INSERT INTO attribute_options (attribute_id, "optionValue", "displayName", "imageUrl", description, "sortOrder", "isActive", created_at, updated_at) VALUES
(2, 'eyes_round', '동글동글', '/assets/character/eyes/round.png', '귀엽고 동그란 눈', 1, true, NOW(), NOW()),
(2, 'eyes_happy', '행복눈', '/assets/character/eyes/happy.png', '웃는 듯한 초승달 눈', 2, true, NOW(), NOW()),
(2, 'eyes_sleepy', '졸린눈', '/assets/character/eyes/sleepy.png', '나른하고 편안한 눈', 3, true, NOW(), NOW()),
(2, 'eyes_sparkle', '반짝눈', '/assets/character/eyes/sparkle.png', '반짝반짝 빛나는 눈', 4, true, NOW(), NOW()),
(2, 'eyes_determined', '의지눈', '/assets/character/eyes/determined.png', '의지가 넘치는 눈', 5, true, NOW(), NOW());

-- 4. 입 모양 옵션 (attribute_id = 3)
INSERT INTO attribute_options (attribute_id, "optionValue", "displayName", "imageUrl", description, "sortOrder", "isActive", created_at, updated_at) VALUES
(3, 'mouth_smile', '미소', '/assets/character/mouth/smile.png', '살짝 올라간 미소', 1, true, NOW(), NOW()),
(3, 'mouth_grin', '활짝웃음', '/assets/character/mouth/grin.png', '활짝 웃는 입', 2, true, NOW(), NOW()),
(3, 'mouth_cat', '고양이입', '/assets/character/mouth/cat.png', '귀여운 고양이 입', 3, true, NOW(), NOW()),
(3, 'mouth_open', '앗!', '/assets/character/mouth/open.png', '놀란 듯 벌린 입', 4, true, NOW(), NOW()),
(3, 'mouth_tongue', '메롱', '/assets/character/mouth/tongue.png', '혀를 내민 장난스러운 입', 5, true, NOW(), NOW());

-- 5. 악세서리 옵션 (attribute_id = 4)
INSERT INTO attribute_options (attribute_id, "optionValue", "displayName", "imageUrl", description, "sortOrder", "isActive", created_at, updated_at) VALUES
(4, 'acc_none', '없음', '/assets/character/accessory/none.png', '악세서리 없음', 0, true, NOW(), NOW()),
(4, 'acc_leaf', '나뭇잎', '/assets/character/accessory/leaf.png', '머리 위 초록 나뭇잎', 1, true, NOW(), NOW()),
(4, 'acc_flower', '꽃', '/assets/character/accessory/flower.png', '예쁜 꽃 장식', 2, true, NOW(), NOW()),
(4, 'acc_ribbon', '리본', '/assets/character/accessory/ribbon.png', '귀여운 리본', 3, true, NOW(), NOW()),
(4, 'acc_hat', '모자', '/assets/character/accessory/hat.png', '작은 모자', 4, true, NOW(), NOW()),
(4, 'acc_crown', '왕관', '/assets/character/accessory/crown.png', '반짝이는 왕관', 5, true, NOW(), NOW());

-- 6. 배경 옵션 (attribute_id = 5)
INSERT INTO attribute_options (attribute_id, "optionValue", "displayName", "imageUrl", description, "sortOrder", "isActive", created_at, updated_at) VALUES
(5, 'bg_forest', '숲속', '/assets/character/background/forest.png', '초록빛 숲속 배경', 1, true, NOW(), NOW()),
(5, 'bg_kitchen', '주방', '/assets/character/background/kitchen.png', '따뜻한 주방 배경', 2, true, NOW(), NOW()),
(5, 'bg_garden', '정원', '/assets/character/background/garden.png', '화사한 정원 배경', 3, true, NOW(), NOW()),
(5, 'bg_sky', '하늘', '/assets/character/background/sky.png', '맑은 하늘 배경', 4, true, NOW(), NOW()),
(5, 'bg_space', '우주', '/assets/character/background/space.png', '신비로운 우주 배경', 5, true, NOW(), NOW());
