#!/bin/bash
set -e

cd "$(dirname "$0")/.."

docker compose up -d

echo "Subindo backend (porta 3000)..."
cd backend
rails s -p 3000 -b 0.0.0.0 &
BACKEND_PID=$!
cd ..

echo "Subindo frontend (porta 5173)..."
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

echo ""
echo "TrackRide rodando:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo "  Rede:     http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "Ctrl+C para parar tudo"

wait
