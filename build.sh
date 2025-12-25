#!/bin/bash

echo "🔨 Building Stability Tracker Docker Images..."
echo ""

# Build backend
echo "📦 Building backend image..."
docker build -t stability-backend -f Dockerfile.backend .

if [ $? -eq 0 ]; then
    echo "✅ Backend image built successfully!"
else
    echo "❌ Backend build failed!"
    exit 1
fi

echo ""

# Build frontend
echo "📦 Building frontend image..."
docker build -t stability-frontend -f Dockerfile.frontend .

if [ $? -eq 0 ]; then
    echo "✅ Frontend image built successfully!"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

echo ""
echo "🎉 All images built successfully!"
echo ""
echo "Images created:"
echo "  - stability-backend"
echo "  - stability-frontend"
echo ""
echo "Run ./run.sh to start the containers"
