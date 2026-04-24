#!/bin/bash

# --- TAMBAHKAN BARIS INI ---
# Berpindah ke root folder project (mundur 2 langkah dari deploy/scripts)
PARENT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" ; pwd -P)
cd "$PARENT_PATH"

# 1. Generate Versi Otomatis
VERSION=$(date +%Y%m%d.%H%M)
CONTAINER_NAME="agamemons_profile"
IMAGE_NAME="agamemons_portal"

echo "🌌 Memulai Ritual Deployment Otomatis di: $PARENT_PATH"
echo "🏷️ Versi Terdeteksi: v$VERSION"

# 2. Hentikan dan Hapus Kontainer Lama
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 3. Build Image
# Sekarang Docker akan menemukan 'Dockerfile' karena kita sudah di Root
echo "🛠️ Membangun Image [$IMAGE_NAME:v$VERSION]..."
docker build -t $IMAGE_NAME:v$VERSION -t $IMAGE_NAME:latest .

# 4. Jalankan Kontainer Baru
echo "🚀 Summoning Container v$VERSION..."
# Sekarang Docker akan menemukan '.env' dan folder 'Data'
docker run -d \
  -p 8080:80 \
  --name $CONTAINER_NAME \
  --env-file .env \
  -v "$(pwd)/Data:/app/Data" \
  --restart always \
  $IMAGE_NAME:v$VERSION

# 5. Pembersihan
docker image prune -f

echo "✅ Ritual Selesai! Portal v$VERSION sudah aktif di port 8080."
echo "--------------------------------------------------------"
echo "📜 Log Image Terbaru:"
docker images | grep $IMAGE_NAME | head -n 3