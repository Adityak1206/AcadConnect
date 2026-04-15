#!/bin/bash
echo "Killing ports..."
lsof -i :3001 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i :3002 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i :8001 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i :8002 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true

# Wait a second to ensure ports are released
sleep 2

echo "Starting user-service on 3001..."
cd /Users/rishabhmalviya/Desktop/AcadConnect/backend/services/user-service
npm run dev > user.log 2>&1 &
echo $! > user.pid

echo "Starting project-service on 3002..."
cd /Users/rishabhmalviya/Desktop/AcadConnect/backend/services/project-service
npm run dev > proj.log 2>&1 &
echo $! > proj.pid

echo "Starting ai-feedback-service on 8001..."
cd /Users/rishabhmalviya/Desktop/AcadConnect/backend/services/ai-feedback-service
source .venv/bin/activate
uvicorn main:app --port 8001 > ai.log 2>&1 &
echo $! > ai.pid

echo "Starting recommendation-service on 8002..."
cd /Users/rishabhmalviya/Desktop/AcadConnect/backend/services/recommendation-service
source .venv/bin/activate
uvicorn main:app --port 8002 > rec.log 2>&1 &
echo $! > rec.pid

echo "Waiting for services to warm up..."
sleep 6

echo "Verifying Health..."
curl -s http://localhost:8001/health || echo "AI Service on 8001 is Down"
curl -s http://localhost:8002/health || echo "Rec Service on 8002 is Down"
curl -s -o /dev/null -w "User Service (3001): %{http_code}\n" http://localhost:3001/api/users/me || echo "User Service Down"
curl -s -o /dev/null -w "Proj Service (3002): %{http_code}\n" http://localhost:3002/api/projects || echo "Proj Service Down"

echo "DONE"
