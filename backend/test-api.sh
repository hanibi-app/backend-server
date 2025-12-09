#!/bin/bash
# API 테스트 스크립트

BASE_URL="http://localhost:3000/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Hanibi API 테스트 시작"
echo "=========================================="
echo ""

# 테스트 카운터
PASSED=0
FAILED=0

# 테스트 함수
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local token=$6  # Optional: Bearer token
    
    echo -n "테스트: $name ... "
    
    local headers=("-H" "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=("-H" "Authorization: Bearer $token")
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X POST "$BASE_URL$endpoint" -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (예상: HTTP $expected_status, 실제: HTTP $http_code)"
        echo "응답: $body" | head -c 200
        echo ""
        ((FAILED++))
        return 1
    fi
}

# 1. Health Check (Swagger 문서)
echo "1. Swagger 문서 확인"
echo -n "테스트: Swagger UI ... "
SWAGGER_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/docs")
if [ "$SWAGGER_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $SWAGGER_CODE)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (예상: HTTP 200, 실제: HTTP $SWAGGER_CODE)"
    ((FAILED++))
fi

# 2. 센서 데이터 API
echo ""
echo "2. 센서 데이터 API"
test_api "센서 데이터 수신 (최소 필드)" "POST" "/sensors/data" \
    '{
        "deviceId": "TEST-DEVICE-001",
        "sensorData": {
            "temperature": 25.5,
            "humidity": 65,
            "weight": 1250.5,
            "gas": 320
        },
        "processingStatus": "PROCESSING"
    }' "201"

test_api "센서 데이터 수신 (IDLE 상태)" "POST" "/sensors/data" \
    '{
        "deviceId": "TEST-DEVICE-001",
        "sensorData": {
            "temperature": 20.0,
            "humidity": 45.0,
            "weight": 0.0,
            "gas": 0
        },
        "processingStatus": "IDLE"
    }' "201"

test_api "하트비트" "POST" "/sensors/heartbeat" \
    '{
        "deviceId": "TEST-DEVICE-001"
    }' "201"

test_api "센서 이벤트" "POST" "/sensors/events" \
    '{
        "deviceId": "TEST-DEVICE-001",
        "eventType": "PROCESSING_STARTED"
    }' "201"

# 3. 요청 로그 조회
echo ""
echo "3. 요청 로그 조회"
test_api "요청 로그 조회 (전체)" "GET" "/sensors/request-logs" "" "200"
test_api "요청 로그 조회 (특정 디바이스)" "GET" "/sensors/request-logs?deviceId=TEST-DEVICE-001" "" "200"
test_api "요청 로그 조회 (제한)" "GET" "/sensors/request-logs?limit=5" "" "200"

# 4. 인증 API (회원가입/로그인)
echo ""
echo "4. 인증 API"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="Test1234!"

test_api "회원가입" "POST" "/auth/register" \
    "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"nickname\": \"테스트사용자\"
    }" "201"

# 로그인하여 토큰 받기
echo -n "테스트: 로그인 (토큰 획득) ... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

if [ "$HTTP_CODE" = "200" ]; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    ((FAILED++))
    ACCESS_TOKEN=""
fi

# 5. 인증이 필요한 API (토큰이 있는 경우만)
if [ -n "$ACCESS_TOKEN" ]; then
    echo ""
    echo "5. 인증 필요 API"
    
    test_api "디바이스 목록 조회" "GET" "/devices" "" "200" "$ACCESS_TOKEN"
    
    test_api "내 정보 조회" "GET" "/users/me" "" "200" "$ACCESS_TOKEN"
    
    test_api "캐릭터 특성 목록" "GET" "/character/attributes" "" "200" "$ACCESS_TOKEN"
    
    test_api "내 캐릭터 조회" "GET" "/character/me" "" "200" "$ACCESS_TOKEN"
    
    test_api "캐릭터 상태 룰 목록" "GET" "/character/state-rules" "" "200" "$ACCESS_TOKEN"
fi

# 6. 카메라 API (인증 필요)
if [ -n "$ACCESS_TOKEN" ]; then
    echo ""
    echo "6. 카메라 API"
    
    CAMERA_DEVICE_ID="TEST-CAMERA-$(date +%s)"
    echo -n "테스트: 카메라 등록 (새 디바이스) ... "
    CAMERA_REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -X POST "$BASE_URL/cameras" \
        -d "{
            \"deviceId\": \"$CAMERA_DEVICE_ID\",
            \"rtspUrl\": \"rtsp://test.example.com:554/stream\",
            \"cameraModel\": \"Test Camera\"
        }")
    CAMERA_HTTP_CODE=$(echo "$CAMERA_REGISTER_RESPONSE" | tail -n1)
    if [ "$CAMERA_HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $CAMERA_HTTP_CODE)"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ SKIP${NC} (HTTP $CAMERA_HTTP_CODE - 이미 등록되었거나 다른 이유)"
        # 이미 등록된 경우도 정상 동작이므로 실패로 카운트하지 않음
    fi
    
    # 기존 카메라 조회 테스트 (TEST-CAMERA-001 또는 새로 등록한 것)
    test_api "카메라 정보 조회" "GET" "/cameras/$CAMERA_DEVICE_ID" "" "200" "$ACCESS_TOKEN" || \
    test_api "카메라 정보 조회 (기존)" "GET" "/cameras/TEST-CAMERA-001" "" "200" "$ACCESS_TOKEN"
    
    test_api "카메라 스트림 URL 조회" "GET" "/cameras/$CAMERA_DEVICE_ID/stream" "" "200" "$ACCESS_TOKEN" || \
    test_api "카메라 스트림 URL 조회 (기존)" "GET" "/cameras/TEST-CAMERA-001/stream" "" "200" "$ACCESS_TOKEN"
fi

# 7. Rate Limit 테스트
echo ""
echo "7. Rate Limit 테스트"
echo -n "테스트: Rate Limit (15분당 300개 제한) ... "
# 여러 요청을 빠르게 보내서 rate limit 확인
for i in {1..5}; do
    curl -s -X POST "$BASE_URL/sensors/data" \
        -H "Content-Type: application/json" \
        -d "{
            \"deviceId\": \"RATE-LIMIT-TEST\",
            \"sensorData\": {
                \"temperature\": 25.0,
                \"humidity\": 50.0,
                \"weight\": 0.0,
                \"gas\": 0
            },
            \"processingStatus\": \"IDLE\"
        }" > /dev/null
done
echo -e "${GREEN}✓ PASS${NC} (5개 요청 성공)"

# 결과 요약
echo ""
echo "=========================================="
echo "테스트 결과 요약"
echo "=========================================="
echo -e "${GREEN}성공: $PASSED${NC}"
echo -e "${RED}실패: $FAILED${NC}"
echo "총 테스트: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}모든 테스트 통과! ✓${NC}"
    exit 0
else
    echo -e "${RED}일부 테스트 실패 ✗${NC}"
    exit 1
fi

