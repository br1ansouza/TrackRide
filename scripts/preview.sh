#!/bin/bash
set -e

cd "$(dirname "$0")/.."

docker compose up -d

echo "Buildando frontend..."
cd frontend
npm run build
cd ..

echo "Subindo backend (porta 3000)..."
cd backend
rails s -p 3000 -b 0.0.0.0 &
BACKEND_PID=$!
cd ..

echo "Subindo frontend preview (porta 4173)..."
cd frontend
set -a && source .env && set +a
HOST=0.0.0.0 PORT=4173 node build &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "TrackRide rodando (preview):"
echo "  Frontend: http://localhost:4173"
echo "  Backend:  http://localhost:3000"
echo "  Celular:  http://$IP:4173"
echo ""
echo "Ctrl+C para parar tudo"

wait
