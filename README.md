# LiveKit Demo App (Self-Hosted)

This repository contains a full local LiveKit demo stack:

- infra: Docker Compose for LiveKit server
- livkit-backend: FastAPI backend for token and room APIs
- livekit-ui: React/Vite frontend to join a room

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Python 3.10+
- Node.js 18+
- npm

## Project Structure

- infra/
- livkit-backend/
- livekit-ui/

## 1) Start Infra (LiveKit Server)

From the repository root:

```bash
cd infra
docker compose up -d
```

Optional logs:

```bash
docker compose logs -f livekit
```

This starts LiveKit on:

- HTTP/Twirp: http://localhost:7880
- RTC TCP: 7881
- RTC UDP: 7882

## 2) Start Backend (FastAPI)

Open a new terminal.

```bash
cd livkit-backend
python -m venv .venv
```

Activate virtual environment:

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create backend env file from template:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

Run backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend endpoints:

- Health: http://localhost:8000/
- Token API: POST http://localhost:8000/livekit/token
- Rooms API: GET/POST/DELETE http://localhost:8000/livekit/rooms

## 3) Start Frontend (Vite)

Open another terminal.

```bash
cd livekit-ui
npm install
```

Create frontend env file from template:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

Run frontend:

```bash
npm run dev
```

Open the URL shown by Vite (usually http://localhost:5173).

## End-to-End Run Order

1. Start infra (docker compose)
2. Start backend (uvicorn)
3. Start frontend (vite)
4. In UI, enter room name, participant identity, participant name, then join

## Quick Verification

1. Infra up:

```bash
docker compose -f infra/docker-compose.yml ps
```

2. Backend health:

```bash
curl http://localhost:8000/
```

Expected response includes:

```json
{
  "status": "ok",
  "service": "LiveKit Python Backend"
}
```

3. Frontend build check:

```bash
cd livekit-ui
npm run build
```

## Common Issues

- CORS error in browser:
  - Ensure backend `.env` has `CORS_ALLOWED_ORIGINS` including your frontend origin.
- Token creation fails at backend startup:
  - Ensure `livkit-backend/.env` exists and has valid `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`.
- Frontend cannot reach backend:
  - Ensure `livekit-ui/.env` has `VITE_BACKEND_HTTP_URL=http://localhost:8000`.
- Frontend cannot connect to LiveKit:
  - Ensure `livekit-ui/.env` has `VITE_LIVEKIT_WS_URL=ws://localhost:7880` and infra is running.

## Stop Services

- Frontend/backend: stop with Ctrl+C in their terminals.
- Infra:

```bash
cd infra
docker compose down
```
