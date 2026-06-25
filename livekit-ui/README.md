# LiveKit UI

React + Vite frontend for joining a LiveKit room.

## Environment variables

Create a `.env` file in this folder (or copy `.env.example`) with:

```env
VITE_BACKEND_HTTP_URL=http://localhost:8000
VITE_LIVEKIT_WS_URL=ws://localhost:7880
```

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app now renders a join form and requests a token from:

- `${VITE_BACKEND_HTTP_URL}/livekit/token`

Then it connects to LiveKit using:

- `${VITE_LIVEKIT_WS_URL}`
