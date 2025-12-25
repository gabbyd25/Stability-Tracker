#!/bin/bash

echo "🚀 Starting Stability Tracker Containers..."
echo ""

# Stop and remove existing containers if they exist
echo "🧹 Cleaning up existing containers..."
docker stop stability-backend-container 2>/dev/null
docker stop stability-frontend-container 2>/dev/null
docker rm stability-backend-container 2>/dev/null
docker rm stability-frontend-container 2>/dev/null

echo ""

# Run backend container with --network=host
echo "🐍 Starting backend container (Django on port 7834)..."
docker run -d \
    --name stability-backend-container \
    --network=host \
    --restart unless-stopped \
    stability-backend

if [ $? -eq 0 ]; then
    echo "✅ Backend container started successfully!"
else
    echo "❌ Backend container failed to start!"
    exit 1
fi

echo ""

# Run frontend container with --network=host
echo "⚛️  Starting frontend container (React on port 5173)..."
docker run -d \
    --name stability-frontend-container \
    --network=host \
    --restart unless-stopped \
    stability-frontend

if [ $? -eq 0 ]; then
    echo "✅ Frontend container started successfully!"
else
    echo "❌ Frontend container failed to start!"
    exit 1
fi

echo ""
echo "🎉 All containers started successfully!"
echo ""
echo "Services running:"
echo "  - Backend:  http://localhost:7834"
echo "  - Frontend: http://localhost:5173"
echo ""
echo "To view logs:"
echo "  docker logs stability-backend-container"
echo "  docker logs stability-frontend-container"
echo ""
echo "To stop containers:"
echo "  docker stop stability-backend-container stability-frontend-container"
