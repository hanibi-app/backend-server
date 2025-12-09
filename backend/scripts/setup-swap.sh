#!/bin/bash
# Swap 메모리 설정 스크립트
# OOM (Out of Memory) 방지를 위한 Swap 메모리 추가

set -e

SWAP_SIZE=${1:-2G}  # 기본값: 2GB
SWAP_FILE="/swapfile"

echo "=== Swap 메모리 설정 시작 ==="

# 이미 Swap이 있는지 확인
if swapon --show | grep -q "$SWAP_FILE"; then
    echo "⚠️  Swap 파일이 이미 활성화되어 있습니다."
    swapon --show
    exit 0
fi

# Swap 파일 생성
echo "📦 ${SWAP_SIZE} 크기의 Swap 파일 생성 중..."
sudo fallocate -l "$SWAP_SIZE" "$SWAP_FILE"

# 권한 설정 (보안)
echo "🔒 Swap 파일 권한 설정 중..."
sudo chmod 600 "$SWAP_FILE"

# Swap 포맷
echo "💾 Swap 포맷 중..."
sudo mkswap "$SWAP_FILE"

# Swap 활성화
echo "✅ Swap 활성화 중..."
sudo swapon "$SWAP_FILE"

# 영구적으로 활성화 (재부팅 후에도 유지)
if ! grep -q "$SWAP_FILE" /etc/fstab; then
    echo "📝 /etc/fstab에 Swap 설정 추가 중..."
    echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
fi

# 결과 확인
echo ""
echo "=== Swap 메모리 설정 완료 ==="
echo "현재 Swap 상태:"
swapon --show
echo ""
echo "전체 메모리 상태:"
free -h
echo ""
echo "✅ Swap 메모리가 성공적으로 설정되었습니다!"



